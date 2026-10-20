import { Module } from '@nestjs/common';
import { ChildrenController } from './children.controller.js';

@Module({ controllers: [ChildrenController] })
export class ChildrenModule {}
