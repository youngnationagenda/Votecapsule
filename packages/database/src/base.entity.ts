/**
 * Vote Capsule™ Base Entity
 *
 * All database entities extend this class.
 * Provides standard UUID primary key, audit timestamps, and soft-delete pattern.
 *
 * Standards:
 * - All IDs: UUID (gen_random_uuid())
 * - All timestamps: UTC stored as TIMESTAMP
 * - Soft deletes: deleted_at TIMESTAMP NULL
 */

export abstract class BaseEntity {
  id!: string;           // UUID v4
  createdAt!: Date;      // UTC — when record was created
  updatedAt!: Date;      // UTC — when record was last modified
}

export abstract class SoftDeletableEntity extends BaseEntity {
  deletedAt!: Date | null; // NULL = active, non-NULL = soft deleted
}
