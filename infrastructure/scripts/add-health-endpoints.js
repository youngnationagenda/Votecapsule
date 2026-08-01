/**
 * Add health controller to all services that don't have one
 */
const fs = require('fs');
const path = require('path');

const SERVICES = ['tenant', 'trust', 'geography', 'evidence', 'ai', 'workflow', 
                  'notification', 'candidate', 'reporting', 'election', 'audit', 'billing'];

for (const svc of SERVICES) {
  const srcDir = path.join('D:/Votecapsule/vote-capsule/services', svc, 'src');
  if (!fs.existsSync(srcDir)) { console.log(`Skip ${svc} — no src dir`); continue; }
  
  const healthFile = path.join(srcDir, 'health.controller.ts');
  if (!fs.existsSync(healthFile)) {
    fs.writeFileSync(healthFile, `import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';\n\n@Controller('health')\nexport class HealthController {\n  @Get()\n  @HttpCode(HttpStatus.OK)\n  check() {\n    return { status: 'ok', service: '${svc}', timestamp: new Date().toISOString() };\n  }\n}\n`);
    console.log(`Created health.controller.ts for ${svc}`);
  }
  
  // Read app.module.ts or main module and add HealthController
  const moduleFiles = ['app.module.ts', `${svc}.module.ts`];
  for (const mf of moduleFiles) {
    const mfPath = path.join(srcDir, mf);
    if (fs.existsSync(mfPath)) {
      let content = fs.readFileSync(mfPath, 'utf8');
      if (!content.includes('HealthController')) {
        // Add import
        const firstImport = content.indexOf("import {");
        const importLine = `import { HealthController } from './health.controller';\n`;
        content = content.slice(0, firstImport) + importLine + content.slice(firstImport);
        // Add to controllers if @Module exists
        if (content.includes('@Module({')) {
          content = content.replace('@Module({', `@Module({\n  controllers: [HealthController],`);
          // Remove duplicate if already has controllers
          content = content.replace(/controllers: \[HealthController\],\n.*controllers: \[/, 'controllers: [HealthController, ');
        }
        fs.writeFileSync(mfPath, content);
        console.log(`Updated ${mf} for ${svc}`);
      }
      break;
    }
  }
}
console.log('Done!');
