import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';

/** Translates the Prisma errors a CRUD endpoint can expect into HTTP errors. */
export function mapPrismaError(e: unknown, entity: string, messages: { unique?: string; inUse?: string } = {}): unknown {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return new ConflictException(messages.unique ?? `${entity} already exists`);
    if (e.code === 'P2025') return new NotFoundException(`${entity} not found`);
    if (e.code === 'P2003') return new ConflictException(messages.inUse ?? `${entity} is still referenced`);
  }
  return e;
}
