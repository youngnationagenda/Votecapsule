// ============================================================
// VoteCapsule — Amazon Textract Processor
// services/ai/src/processors/textract.processor.ts
//
// Submits evidence images to Amazon Textract for OCR and
// extracts structured election result data from IEBC Form 37A/37B.
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import {
  TextractClient,
  AnalyzeDocumentCommand,
  AnalyzeDocumentCommandOutput,
  Block,
  BlockType,
  EntityType,
} from '@aws-sdk/client-textract';
import { ConfigService } from '@nestjs/config';

export interface TextractExtractionResult {
  success:       boolean;
  ocrConfidence: number;
  blocks:        Block[];
  rawText:       string;
  keyValuePairs: Record<string, string>;
  tables:        TableRow[][];
  error?:        string;
}

export interface TableRow {
  cells: string[];
}

export interface ExtractedElectionData {
  stationCode:      string | null;
  stationName:      string | null;
  position:         string | null;
  streamNumber:     number | null;
  registeredVoters: number | null;
  votesCast:        number | null;
  validVotes:       number | null;
  rejectedVotes:    number | null;
  confidence:       number;
}

@Injectable()
export class TextractProcessor {
  private readonly logger = new Logger(TextractProcessor.name);
  private readonly textractClient: TextractClient;

  constructor(private readonly config: ConfigService) {
    const region = config.get('AWS_REGION', 'af-south-1');
    this.textractClient = new TextractClient({ region });
  }

  async analyzeDocument(s3Bucket: string, s3Key: string): Promise<TextractExtractionResult> {
    try {
      const command = new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: s3Bucket, Name: s3Key } },
        FeatureTypes: ['FORMS', 'TABLES'],
      });
      const response: AnalyzeDocumentCommandOutput = await this.textractClient.send(command);
      const blocks = response.Blocks ?? [];
      return {
        success:       true,
        ocrConfidence: this.computeAverageOcrConfidence(blocks),
        blocks,
        rawText:       this.extractRawText(blocks),
        keyValuePairs: this.extractKeyValuePairs(blocks),
        tables:        this.extractTables(blocks),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Textract failed for s3://${s3Bucket}/${s3Key}: ${msg}`);
      return { success: false, ocrConfidence: 0, blocks: [], rawText: '', keyValuePairs: {}, tables: [], error: msg };
    }
  }

  parseElectionData(result: TextractExtractionResult): ExtractedElectionData {
    const kv = result.keyValuePairs;
    const text = result.rawText.toUpperCase();
    return {
      stationCode:      this.extractStationCode(kv, text),
      stationName:      this.extractValue(kv, ['POLLING STATION', 'STATION NAME', 'STATION']),
      position:         this.extractPosition(kv, text),
      streamNumber:     this.extractNumber(kv, ['STREAM', 'STREAM NO', 'STREAM NUMBER']),
      registeredVoters: this.extractNumber(kv, ['REGISTERED VOTERS', 'TOTAL REGISTERED', 'NO OF REGISTERED']),
      votesCast:        this.extractNumber(kv, ['TOTAL VOTES CAST', 'VOTES CAST', 'TOTAL CAST']),
      validVotes:       this.extractValidVotesFromTable(result.tables),
      rejectedVotes:    this.extractNumber(kv, ['REJECTED', 'REJECTED VOTES', 'REJECTED BALLOT']),
      confidence:       result.ocrConfidence,
    };
  }

  private computeAverageOcrConfidence(blocks: Block[]): number {
    const wordBlocks = blocks.filter((b) => b.BlockType === BlockType.WORD && b.Confidence != null);
    if (wordBlocks.length === 0) return 0;
    const sum = wordBlocks.reduce((acc, b) => acc + (b.Confidence ?? 0), 0);
    return Math.round((sum / wordBlocks.length) * 10000) / 10000 / 100;
  }

  private extractRawText(blocks: Block[]): string {
    return blocks.filter((b) => b.BlockType === BlockType.LINE).map((b) => b.Text ?? '').join('\n');
  }

  private extractKeyValuePairs(blocks: Block[]): Record<string, string> {
    const result: Record<string, string> = {};
    const blockMap = new Map(blocks.map((b) => [b.Id, b]));
    for (const block of blocks) {
      if (block.BlockType !== BlockType.KEY_VALUE_SET) continue;
      if (!block.EntityTypes?.includes(EntityType.KEY)) continue;
      const key   = this.getTextForBlock(block, blockMap);
      const value = this.getValueForKey(block, blockMap);
      if (key) result[key.trim().toUpperCase()] = value.trim();
    }
    return result;
  }

  private getTextForBlock(block: Block, blockMap: Map<string | undefined, Block>): string {
    const childIds = block.Relationships?.find((r) => r.Type === 'CHILD')?.Ids ?? [];
    return childIds.map((id) => blockMap.get(id)?.Text ?? '').join(' ');
  }

  private getValueForKey(keyBlock: Block, blockMap: Map<string | undefined, Block>): string {
    const valueBlockId = keyBlock.Relationships?.find((r) => r.Type === 'VALUE')?.Ids?.[0];
    if (!valueBlockId) return '';
    const valueBlock = blockMap.get(valueBlockId);
    if (!valueBlock) return '';
    return this.getTextForBlock(valueBlock, blockMap);
  }

  private extractTables(blocks: Block[]): TableRow[][] {
    const tables: TableRow[][] = [];
    const blockMap = new Map(blocks.map((b) => [b.Id, b]));
    const tableBlocks = blocks.filter((b) => b.BlockType === BlockType.TABLE);
    for (const table of tableBlocks) {
      const rows: TableRow[] = [];
      const cellIds = table.Relationships?.find((r) => r.Type === 'CHILD')?.Ids ?? [];
      const cells = cellIds.map((id) => blockMap.get(id)).filter((b): b is Block => b?.BlockType === BlockType.CELL);
      const rowMap = new Map<number, Block[]>();
      for (const cell of cells) {
        const rowIdx = cell.RowIndex ?? 0;
        if (!rowMap.has(rowIdx)) rowMap.set(rowIdx, []);
        rowMap.get(rowIdx)!.push(cell);
      }
      for (const [, rowCells] of [...rowMap.entries()].sort(([a], [b]) => a - b)) {
        const sorted = rowCells.sort((a, b) => (a.ColumnIndex ?? 0) - (b.ColumnIndex ?? 0));
        rows.push({ cells: sorted.map((c) => this.getTextForBlock(c, blockMap)) });
      }
      tables.push(rows);
    }
    return tables;
  }

  private extractStationCode(kv: Record<string, string>, text: string): string | null {
    for (const key of ['STATION CODE', 'POLLING STATION CODE', 'CODE']) {
      if (kv[key] && /^\d{15}$/.test((kv[key] ?? '').replace(/\s/g, ''))) {
        return (kv[key] ?? '').replace(/\s/g, '');
      }
    }
    const match = text.match(/\b(\d{15})\b/);
    return match?.[1] ?? null;
  }

  private extractPosition(kv: Record<string, string>, text: string): string | null {
    const positions: Record<string, string> = {
      'PRESIDENT': 'PRESIDENT', 'GOVERNOR': 'GOVERNOR', 'SENATOR': 'SENATOR',
      'WOMEN REPRESENTATIVE': 'WOMEN_REP', 'WOMEN REP': 'WOMEN_REP',
      'MEMBER OF PARLIAMENT': 'MP', 'MEMBER OF NATIONAL ASSEMBLY': 'MP', 'MP': 'MP',
      'MEMBER OF COUNTY ASSEMBLY': 'MCA', 'MCA': 'MCA',
    };
    for (const [key, value] of Object.entries(positions)) {
      if (text.includes(key)) return value;
    }
    return this.extractValue(kv, ['POSITION', 'ELECTION POSITION'])?.toUpperCase() ?? null;
  }

  private extractValue(kv: Record<string, string>, keys: string[]): string | null {
    for (const key of keys) {
      if (kv[key]) return kv[key] ?? null;
      const match = Object.entries(kv).find(([k]) => k.includes(key));
      if (match) return match[1] ?? null;
    }
    return null;
  }

  private extractNumber(kv: Record<string, string>, keys: string[]): number | null {
    const val = this.extractValue(kv, keys);
    if (!val) return null;
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? null : num;
  }

  private extractValidVotesFromTable(tables: TableRow[][]): number | null {
    for (const table of tables) {
      for (const row of [...table].reverse()) {
        const rowText = row.cells.join(' ').toUpperCase();
        if (rowText.includes('TOTAL') || rowText.includes('VALID')) {
          for (const cell of [...row.cells].reverse()) {
            const num = parseInt(cell.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(num) && num > 0) return num;
          }
        }
      }
    }
    return null;
  }
}
