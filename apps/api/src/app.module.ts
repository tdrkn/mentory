import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma';
import { HealthController } from './health/health.controller';
import { RequestLoggerMiddleware } from './common';

// Feature modules
import { AuthModule } from './modules/auth';
import { ProfilesModule } from './modules/profiles';
import { DiscoveryModule } from './modules/discovery';
import { SchedulingModule } from './modules/scheduling';
import { SessionsModule } from './modules/sessions';
import { BookingModule } from './modules/booking';
import { PaymentsModule } from './modules/payments';
import { ChatModule } from './modules/chat';
import { NotificationsModule } from './modules/notifications';
import { TrustModule } from './modules/trust';
import { AdminBootstrapService } from './admin/admin-bootstrap.service';

@Module({
  imports: [
    // Core
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      expandVariables: true,
    }),
    PrismaModule,

    // Feature modules
    AuthModule,
    ProfilesModule,
    DiscoveryModule,
    SchedulingModule,
    SessionsModule,
    BookingModule,
    PaymentsModule,
    ChatModule,
    NotificationsModule,
    TrustModule,
  ],
  controllers: [HealthController],
  providers: [AdminBootstrapService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply request logging middleware to all routes
    if (process.env.ENABLE_REQUEST_LOGGING !== 'false') {
      consumer.apply(RequestLoggerMiddleware).forRoutes('*');
    }
  }
}
