import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { TrustService } from './trust.service';
import { UploadRegaliaDto } from './dto/upload-regalia.dto';

@Controller('regalia')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentor', 'both')
export class RegaliaController {
  constructor(private readonly trustService: TrustService) {}

  @Get('mine')
  async getMine(@CurrentUser('id') mentorId: string) {
    return this.trustService.getMyRegalia(mentorId);
  }

  @Post()
  async upload(
    @CurrentUser('id') mentorId: string,
    @Body() dto: UploadRegaliaDto,
  ) {
    return this.trustService.uploadRegalia(mentorId, dto);
  }
}
