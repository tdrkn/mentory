import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles, Public } from '../auth/decorators';
import { SchedulingService } from './scheduling.service';
import { CreateAvailabilityRuleDto } from './dto/create-availability-rule.dto';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { GenerateSlotsDto } from './dto/generate-slots.dto';

@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // ============================================
  // Availability Rules (Mentor only)
  // ============================================

  /**
   * GET /api/scheduling/rules
   * Get mentor's availability rules
   * Access: Mentor
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  @Get('rules')
  async getRules(@CurrentUser('id') mentorId: string) {
    return this.schedulingService.getAvailabilityRules(mentorId);
  }

  /**
   * POST /api/scheduling/rules
   * Create availability rule
   * Access: Mentor
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  @Post('rules')
  async createRule(
    @CurrentUser('id') mentorId: string,
    @Body() dto: CreateAvailabilityRuleDto,
  ) {
    return this.schedulingService.createAvailabilityRule(mentorId, dto);
  }

  /**
   * PUT /api/scheduling/rules
   * Replace all availability rules
   * Access: Mentor
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  @Put('rules')
  async updateRules(
    @CurrentUser('id') mentorId: string,
    @Body() rules: CreateAvailabilityRuleDto[],
  ) {
    return this.schedulingService.updateAvailabilityRules(mentorId, rules);
  }

  /**
   * DELETE /api/scheduling/rules/:id
   * Delete availability rule
   * Access: Mentor
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  @Delete('rules/:id')
  async deleteRule(
    @CurrentUser('id') mentorId: string,
    @Param('id') ruleId: string,
  ) {
    return this.schedulingService.deleteAvailabilityRule(mentorId, ruleId);
  }

  // ============================================
  // Exceptions (Mentor only)
  // ============================================

  /**
   * GET /api/scheduling/exceptions
   * Get mentor's exceptions
   * Access: Mentor
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  @Get('exceptions')
  async getExceptions(
    @CurrentUser('id') mentorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.schedulingService.getExceptions(mentorId, from, to);
  }

  /**
   * POST /api/scheduling/exceptions
   * Create exception (day off)
   * Access: Mentor
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  @Post('exceptions')
  async createException(
    @CurrentUser('id') mentorId: string,
    @Body() dto: CreateExceptionDto,
  ) {
    return this.schedulingService.createException(mentorId, dto);
  }

  /**
   * DELETE /api/scheduling/exceptions/:id
   * Delete exception
   * Access: Mentor
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  @Delete('exceptions/:id')
  async deleteException(
    @CurrentUser('id') mentorId: string,
    @Param('id') exceptionId: string,
  ) {
    return this.schedulingService.deleteException(mentorId, exceptionId);
  }

  // ============================================
  // Public Slots API
  // ============================================

  /**
   * GET /api/scheduling/mentors/:mentorId/slots
   * Get available slots for mentor (PUBLIC)
   * Returns only free slots, releases expired holds
   * All times in UTC
   * Access: Public
   */
  @Public()
  @Get('/mentors/:mentorId/slots')
  async getPublicSlots(
    @Param('mentorId') mentorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.schedulingService.getAvailableSlots(mentorId, from, to);
  }

  // ============================================
  // Mentor Slots Management
  // ============================================

  /**
   * GET /api/scheduling/slots
   * Get mentor's all slots
   * Access: Mentor
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  @Get('slots')
  async getSlots(
    @CurrentUser('id') mentorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.schedulingService.getMentorSlots(mentorId, from, to, status);
  }

  /**
   * POST /api/scheduling/slots/generate
   * Generate slots based on rules
   * Access: Mentor
   */
  @Post('slots/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  async generateSlots(
    @CurrentUser('id') mentorId: string,
    @Body() dto: GenerateSlotsDto,
  ) {
    return this.schedulingService.generateSlots(mentorId, dto);
  }

  /**
   * DELETE /api/scheduling/slots/:id
   * Delete a free slot
   * Access: Mentor
   */
  @Delete('slots/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  async deleteSlot(
    @CurrentUser('id') mentorId: string,
    @Param('id') slotId: string,
  ) {
    return this.schedulingService.deleteSlot(mentorId, slotId);
  }

  // ============================================
  // Calendar View
  // ============================================

  /**
   * GET /api/scheduling/calendar
   * Get calendar view (slots + sessions)
   * Access: Mentor
   */
  @Get('calendar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('mentor', 'both')
  async getCalendar(
    @CurrentUser('id') mentorId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.schedulingService.getCalendar(mentorId, from, to);
  }
}
