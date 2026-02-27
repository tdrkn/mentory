import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma';
import { TrustService } from './trust.service';
import { ComplaintsController } from './complaints.controller';
import { RegaliaController } from './regalia.controller';
import { AdminTrustController } from './admin-trust.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ComplaintsController, RegaliaController, AdminTrustController],
  providers: [TrustService],
  exports: [TrustService],
})
export class TrustModule {}
