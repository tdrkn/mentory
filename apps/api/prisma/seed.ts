// ============================================
// Mentory Seed Script
// ============================================
// Creates test data for development
// Run: pnpm prisma db seed

import { PrismaClient, UserRole, SlotStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { addDays, addMinutes, startOfDay, isAfter } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

// ============================================
// Helper Functions
// ============================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function getWeekday(date: Date): number {
  // Convert JS weekday (0=Sun) to ISO weekday (1=Mon, 7=Sun)
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

// ============================================
// Seed Data
// ============================================

async function main() {
  console.log('🌱 Starting seed...\n');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.sessionNote.deleteMany();
  await prisma.videoRoom.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.session.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.availabilityException.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.mentorService.deleteMany();
  await prisma.mentorTopic.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.mentorProfile.deleteMany();
  await prisma.menteeProfile.deleteMany();
  await prisma.user.deleteMany();

  // ============================================
  // Create Topics
  // ============================================
  console.log('📚 Creating topics...');
  const topics = await Promise.all([
    prisma.topic.create({ data: { name: 'Backend Development' } }),
    prisma.topic.create({ data: { name: 'Frontend Development' } }),
    prisma.topic.create({ data: { name: 'System Design' } }),
    prisma.topic.create({ data: { name: 'Career Growth' } }),
    prisma.topic.create({ data: { name: 'Product Management' } }),
    prisma.topic.create({ data: { name: 'Data Science' } }),
    prisma.topic.create({ data: { name: 'DevOps & Infrastructure' } }),
    prisma.topic.create({ data: { name: 'Startup & Entrepreneurship' } }),
  ]);
  console.log(`   Created ${topics.length} topics`);

  // ============================================
  // Create Users: Mentors
  // ============================================
  console.log('👨‍🏫 Creating mentors...');
  const passwordHash = await hashPassword('password123');

  const mentor1 = await prisma.user.create({
    data: {
      email: 'alex.mentor@example.com',
      passwordHash,
      fullName: 'Алексей Петров',
      timezone: 'Europe/Moscow',
      role: UserRole.mentor,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      mentorProfile: {
        create: {
          headline: 'Senior Software Engineer @ Yandex',
          bio: 'Более 10 лет опыта в backend-разработке. Помогаю разработчикам расти от junior до senior. Специализируюсь на архитектуре высоконагруженных систем.',
          languages: ['Русский', 'English'],
          timezone: 'Europe/Moscow',
          isActive: true,
          ratingAvg: 4.85,
          ratingCount: 47,
        },
      },
    },
  });

  const mentor2 = await prisma.user.create({
    data: {
      email: 'maria.mentor@example.com',
      passwordHash,
      fullName: 'Мария Иванова',
      timezone: 'Europe/Moscow',
      role: UserRole.mentor,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      mentorProfile: {
        create: {
          headline: 'Engineering Manager @ VK',
          bio: 'Прошла путь от junior developer до Engineering Manager. Помогаю с карьерным ростом, переходом в менеджмент и развитием soft skills.',
          languages: ['Русский', 'English', 'Deutsch'],
          timezone: 'Europe/Moscow',
          isActive: true,
          ratingAvg: 4.92,
          ratingCount: 63,
        },
      },
    },
  });

  console.log(`   Created mentors: ${mentor1.fullName}, ${mentor2.fullName}`);

  // ============================================
  // Create Users: Mentees
  // ============================================
  console.log('👨‍🎓 Creating mentees...');

  const mentee1 = await prisma.user.create({
    data: {
      email: 'ivan.mentee@example.com',
      passwordHash,
      fullName: 'Иван Сидоров',
      timezone: 'Europe/Moscow',
      role: UserRole.mentee,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      menteeProfile: {
        create: {
          background: 'Junior Backend Developer, 1.5 года опыта. Работаю с Node.js и PostgreSQL.',
          goals: ['Хочу вырасти до Middle/Senior уровня', 'Улучшить понимание архитектуры и системного дизайна'],
          interests: ['Backend', 'System Design', 'Databases'],
        },
      },
    },
  });

  const mentee2 = await prisma.user.create({
    data: {
      email: 'anna.mentee@example.com',
      passwordHash,
      fullName: 'Анна Козлова',
      timezone: 'Europe/Moscow',
      role: UserRole.mentee,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      menteeProfile: {
        create: {
          background: 'Middle Frontend Developer, 3 года опыта. React, TypeScript.',
          goals: ['Планирую переход в Product Management', 'Нужна помощь с подготовкой и пониманием роли'],
          interests: ['Product Management', 'Career', 'Leadership'],
        },
      },
    },
  });

  console.log(`   Created mentees: ${mentee1.fullName}, ${mentee2.fullName}`);

  // ============================================
  // Assign Topics to Mentors
  // ============================================
  console.log('🏷️  Assigning topics to mentors...');

  await prisma.mentorTopic.createMany({
    data: [
      { mentorId: mentor1.id, topicId: topics[0].id }, // Backend
      { mentorId: mentor1.id, topicId: topics[2].id }, // System Design
      { mentorId: mentor1.id, topicId: topics[6].id }, // DevOps
      { mentorId: mentor2.id, topicId: topics[3].id }, // Career Growth
      { mentorId: mentor2.id, topicId: topics[4].id }, // Product Management
      { mentorId: mentor2.id, topicId: topics[7].id }, // Startup
    ],
  });

  // ============================================
  // Create Mentor Services
  // ============================================
  console.log('💼 Creating mentor services...');

  const services1 = await prisma.mentorService.createMany({
    data: [
      {
        mentorId: mentor1.id,
        title: 'Разбор кода / Code Review',
        durationMin: 45,
        priceAmount: 3000,
        currency: 'RUB',
        isActive: true,
      },
      {
        mentorId: mentor1.id,
        title: 'Карьерная консультация',
        durationMin: 60,
        priceAmount: 4500,
        currency: 'RUB',
        isActive: true,
      },
      {
        mentorId: mentor1.id,
        title: 'System Design Interview Prep',
        durationMin: 90,
        priceAmount: 6000,
        currency: 'RUB',
        isActive: true,
      },
    ],
  });

  const services2 = await prisma.mentorService.createMany({
    data: [
      {
        mentorId: mentor2.id,
        title: 'Карьерный разбор',
        durationMin: 60,
        priceAmount: 5000,
        currency: 'RUB',
        isActive: true,
      },
      {
        mentorId: mentor2.id,
        title: 'Переход в менеджмент',
        durationMin: 60,
        priceAmount: 5500,
        currency: 'RUB',
        isActive: true,
      },
      {
        mentorId: mentor2.id,
        title: 'Mock Interview (Behavioral)',
        durationMin: 45,
        priceAmount: 4000,
        currency: 'RUB',
        isActive: true,
      },
    ],
  });

  console.log(`   Created ${services1.count + services2.count} services`);

  // ============================================
  // Create Availability Rules
  // ============================================
  console.log('📅 Creating availability rules...');

  // Mentor 1: Mon-Fri 10:00-13:00 and 15:00-18:00
  await prisma.availabilityRule.createMany({
    data: [
      // Morning slots (Mon-Fri)
      { mentorId: mentor1.id, weekday: 1, startTime: '10:00', endTime: '13:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor1.id, weekday: 2, startTime: '10:00', endTime: '13:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor1.id, weekday: 3, startTime: '10:00', endTime: '13:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor1.id, weekday: 4, startTime: '10:00', endTime: '13:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor1.id, weekday: 5, startTime: '10:00', endTime: '13:00', timezone: 'Europe/Moscow' },
      // Afternoon slots (Mon-Fri)
      { mentorId: mentor1.id, weekday: 1, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor1.id, weekday: 2, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor1.id, weekday: 3, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor1.id, weekday: 4, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor1.id, weekday: 5, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    ],
  });

  // Mentor 2: Tue-Sat 18:00-21:00
  await prisma.availabilityRule.createMany({
    data: [
      { mentorId: mentor2.id, weekday: 2, startTime: '18:00', endTime: '21:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor2.id, weekday: 3, startTime: '18:00', endTime: '21:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor2.id, weekday: 4, startTime: '18:00', endTime: '21:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor2.id, weekday: 5, startTime: '18:00', endTime: '21:00', timezone: 'Europe/Moscow' },
      { mentorId: mentor2.id, weekday: 6, startTime: '10:00', endTime: '14:00', timezone: 'Europe/Moscow' },
    ],
  });

  // ============================================
  // Generate Slots for Next 7 Days
  // ============================================
  console.log('🕐 Generating slots for next 7 days...');

  const today = startOfDay(new Date());
  const slotDuration = 60; // minutes
  const slotsData: { mentorId: string; startAt: Date; endAt: Date; status: SlotStatus }[] = [];

  // Get availability rules
  const rules = await prisma.availabilityRule.findMany();

  const fromDate = addDays(today, 1);
  const toDate = addDays(today, 7);

  for (const rule of rules) {
    const ruleTz = rule.timezone || 'UTC';
    const fromZoned = startOfDay(toZonedTime(fromDate, ruleTz));
    const toZoned = startOfDay(toZonedTime(toDate, ruleTz));

    for (let d = fromZoned; !isAfter(d, toZoned); d = addDays(d, 1)) {
      const weekday = getWeekday(d);
      if (rule.weekday !== weekday) continue;

      const [startHour, startMin] = rule.startTime.split(':').map(Number);
      const [endHour, endMin] = rule.endTime.split(':').map(Number);

      const localStart = new Date(d);
      localStart.setHours(startHour, startMin, 0, 0);

      const localEnd = new Date(d);
      localEnd.setHours(endHour, endMin, 0, 0);

      let slotStartUtc = fromZonedTime(localStart, ruleTz);
      const windowEndUtc = fromZonedTime(localEnd, ruleTz);

      while (slotStartUtc.getTime() + slotDuration * 60 * 1000 <= windowEndUtc.getTime()) {
        const slotEndUtc = addMinutes(slotStartUtc, slotDuration);

        slotsData.push({
          mentorId: rule.mentorId,
          startAt: new Date(slotStartUtc),
          endAt: new Date(slotEndUtc),
          status: SlotStatus.free,
        });

        slotStartUtc = slotEndUtc;
      }
    }
  }

  await prisma.slot.createMany({ data: slotsData });
  console.log(`   Created ${slotsData.length} slots`);

  // ============================================
  // Summary
  // ============================================
  console.log('\n✅ Seed completed!\n');
  console.log('📊 Summary:');
  console.log(`   - Topics: ${topics.length}`);
  console.log(`   - Mentors: 2 (alex.mentor@example.com, maria.mentor@example.com)`);
  console.log(`   - Mentees: 2 (ivan.mentee@example.com, anna.mentee@example.com)`);
  console.log(`   - Services: 6`);
  console.log(`   - Slots: ${slotsData.length}`);
  console.log('\n🔐 All users password: password123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
