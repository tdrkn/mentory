const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function getWeekday(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Approximate timezone offset for Europe/Moscow (UTC+3)
function fromMoscowTime(localDate) {
  return new Date(localDate.getTime() - 3 * 60 * 60 * 1000);
}

async function main() {
  console.log('🌱 Starting seed...');

  // Clean all data except admin
  await prisma.platformWithdrawal.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.userBlock.deleteMany();
  await prisma.moderationAction.deleteMany();
  await prisma.mentorRegalia.deleteMany();
  await prisma.complaintMessage.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.mentorshipBookmark.deleteMany();
  await prisma.mentorshipTask.deleteMany();
  await prisma.mentorshipSubscription.deleteMany();
  await prisma.mentorshipPlan.deleteMany();
  await prisma.menteeCreditTransaction.deleteMany();
  await prisma.menteeCreditBalance.deleteMany();
  await prisma.userAgreement.deleteMany();
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
  await prisma.user.deleteMany({ where: { role: { not: 'admin' } } });

  const passwordHash = await bcrypt.hash('password123', 10);

  // Topics
  const topics = await Promise.all([
    prisma.topic.create({ data: { name: 'Backend Development' } }),
    prisma.topic.create({ data: { name: 'Frontend Development' } }),
    prisma.topic.create({ data: { name: 'System Design' } }),
    prisma.topic.create({ data: { name: 'Career Growth' } }),
    prisma.topic.create({ data: { name: 'Product Management' } }),
    prisma.topic.create({ data: { name: 'Data Science' } }),
    prisma.topic.create({ data: { name: 'DevOps & Infrastructure' } }),
    prisma.topic.create({ data: { name: 'Startup & Entrepreneurship' } }),
    prisma.topic.create({ data: { name: 'AI Product Engineering' } }),
    prisma.topic.create({ data: { name: 'Full-Stack Development' } }),
  ]);
  console.log(`✓ Topics: ${topics.length}`);

  // Mentor 0
  const mentor0 = await prisma.user.create({
    data: {
      email: 'danil.rastyapin@example.com',
      username: 'danil_rastyapin',
      passwordHash,
      fullName: 'Растяпин Данил',
      firstName: 'Данил',
      lastName: 'Растяпин',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=480&q=80',
      timezone: 'Europe/Moscow',
      role: 'mentor',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      mentorProfile: { create: {
        headline: 'Product Engineer',
        bio: 'Помогаю разбирать продуктовую логику, собирать MVP, приводить интерфейсы и архитектуру к понятному рабочему состоянию без лишней сложности.',
        education: 'НИУ ВШЭ, бизнес-информатика',
        position: 'Product Engineer',
        workplace: 'Проектная разработка',
        activityFields: ['Product Engineering', 'Full-Stack', 'Startup', 'Architecture'],
        skills: ['Product Thinking', 'SvelteKit', 'NestJS', 'Prisma', 'PostgreSQL', 'UX/CJM', 'Docker'],
        hobbies: ['Продуктовые эксперименты', 'Дизайн интерфейсов', 'Автоматизация'],
        languages: ['Русский', 'English'],
        timezone: 'Europe/Moscow',
        isActive: true,
        ratingAvg: 5.0,
        ratingCount: 77,
      }},
    },
  });

  // Mentor 1
  const mentor1 = await prisma.user.create({
    data: {
      email: 'alex.mentor@example.com',
      username: 'alex_mentor',
      passwordHash,
      fullName: 'Алексей Петров',
      timezone: 'Europe/Moscow',
      role: 'mentor',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      mentorProfile: { create: {
        headline: 'Senior Software Engineer @ Yandex',
        bio: 'Более 10 лет опыта в backend-разработке. Помогаю разработчикам расти от junior до senior.',
        languages: ['Русский', 'English'],
        timezone: 'Europe/Moscow',
        isActive: true,
        ratingAvg: 4.85,
        ratingCount: 47,
      }},
    },
  });

  // Mentor 2
  const mentor2 = await prisma.user.create({
    data: {
      email: 'maria.mentor@example.com',
      username: 'maria_mentor',
      passwordHash,
      fullName: 'Мария Иванова',
      timezone: 'Europe/Moscow',
      role: 'mentor',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      mentorProfile: { create: {
        headline: 'Engineering Manager @ VK',
        bio: 'Прошла путь от junior developer до Engineering Manager. Помогаю с карьерным ростом.',
        languages: ['Русский', 'English', 'Deutsch'],
        timezone: 'Europe/Moscow',
        isActive: true,
        ratingAvg: 4.92,
        ratingCount: 63,
      }},
    },
  });

  // Mentee 1
  const mentee1 = await prisma.user.create({
    data: {
      email: 'ivan.mentee@example.com',
      username: 'ivan_mentee',
      passwordHash,
      fullName: 'Иван Сидоров',
      timezone: 'Europe/Moscow',
      role: 'mentee',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      menteeProfile: { create: {
        background: 'Junior Backend Developer, 1.5 года опыта. Работаю с Node.js и PostgreSQL.',
        goals: ['Вырасти до Middle/Senior уровня'],
        interests: ['Backend', 'System Design'],
      }},
    },
  });

  // Mentee 2
  const mentee2 = await prisma.user.create({
    data: {
      email: 'anna.mentee@example.com',
      username: 'anna_mentee',
      passwordHash,
      fullName: 'Анна Козлова',
      timezone: 'Europe/Moscow',
      role: 'mentee',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      menteeProfile: { create: {
        background: 'Middle Frontend Developer, 3 года опыта. React, TypeScript.',
        goals: ['Переход в Product Management'],
        interests: ['Product Management', 'Career'],
      }},
    },
  });
  console.log(`✓ Users: ${mentor0.fullName}, ${mentor1.fullName}, ${mentor2.fullName}, ${mentee1.fullName}, ${mentee2.fullName}`);

  // Topics for mentors
  await prisma.mentorTopic.createMany({ data: [
    { mentorId: mentor0.id, topicId: topics[8].id },
    { mentorId: mentor0.id, topicId: topics[9].id },
    { mentorId: mentor0.id, topicId: topics[4].id },
    { mentorId: mentor0.id, topicId: topics[2].id },
    { mentorId: mentor0.id, topicId: topics[7].id },
    { mentorId: mentor1.id, topicId: topics[0].id },
    { mentorId: mentor1.id, topicId: topics[2].id },
    { mentorId: mentor1.id, topicId: topics[6].id },
    { mentorId: mentor2.id, topicId: topics[3].id },
    { mentorId: mentor2.id, topicId: topics[4].id },
    { mentorId: mentor2.id, topicId: topics[7].id },
  ]});

  // Services
  await prisma.mentorService.createMany({ data: [
    { mentorId: mentor0.id, title: 'Разбор MVP и продуктовой логики', durationMin: 60, priceAmount: 5000, currency: 'RUB' },
    { mentorId: mentor0.id, title: 'Архитектура full-stack проекта', durationMin: 90, priceAmount: 7500, currency: 'RUB' },
    { mentorId: mentor0.id, title: 'Запуск проекта от идеи до демо', durationMin: 75, priceAmount: 6500, currency: 'RUB' },
    { mentorId: mentor1.id, title: 'Разбор кода / Code Review', durationMin: 45, priceAmount: 3000, currency: 'RUB' },
    { mentorId: mentor1.id, title: 'Карьерная консультация', durationMin: 60, priceAmount: 4500, currency: 'RUB' },
    { mentorId: mentor1.id, title: 'System Design Interview Prep', durationMin: 90, priceAmount: 6000, currency: 'RUB' },
    { mentorId: mentor2.id, title: 'Карьерный разбор', durationMin: 60, priceAmount: 5000, currency: 'RUB' },
    { mentorId: mentor2.id, title: 'Переход в менеджмент', durationMin: 60, priceAmount: 5500, currency: 'RUB' },
    { mentorId: mentor2.id, title: 'Mock Interview (Behavioral)', durationMin: 45, priceAmount: 4000, currency: 'RUB' },
  ]});
  console.log('✓ Services created');

  // Agreements
  await prisma.userAgreement.createMany({ data: [
    mentor0.id, mentor1.id, mentor2.id, mentee1.id, mentee2.id
  ].map(userId => ({ userId, documentType: 'terms', documentVersion: '1.0' }))});

  // Availability rules
  const rules = [
    // Mentor 0: Mon-Fri 14:00-18:00 MSK
    { mentorId: mentor0.id, weekday: 1, startTime: '14:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor0.id, weekday: 2, startTime: '14:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor0.id, weekday: 3, startTime: '14:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor0.id, weekday: 4, startTime: '14:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor0.id, weekday: 5, startTime: '14:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    // Mentor 1: Mon-Fri 10:00-13:00 MSK
    { mentorId: mentor1.id, weekday: 1, startTime: '10:00', endTime: '13:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor1.id, weekday: 2, startTime: '10:00', endTime: '13:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor1.id, weekday: 3, startTime: '10:00', endTime: '13:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor1.id, weekday: 4, startTime: '10:00', endTime: '13:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor1.id, weekday: 5, startTime: '10:00', endTime: '13:00', timezone: 'Europe/Moscow' },
    // Mentor 1: Mon-Fri 15:00-18:00 MSK
    { mentorId: mentor1.id, weekday: 1, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor1.id, weekday: 2, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor1.id, weekday: 3, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor1.id, weekday: 4, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor1.id, weekday: 5, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Moscow' },
    // Mentor 2: Tue-Sat 18:00-21:00 MSK
    { mentorId: mentor2.id, weekday: 2, startTime: '18:00', endTime: '21:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor2.id, weekday: 3, startTime: '18:00', endTime: '21:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor2.id, weekday: 4, startTime: '18:00', endTime: '21:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor2.id, weekday: 5, startTime: '18:00', endTime: '21:00', timezone: 'Europe/Moscow' },
    { mentorId: mentor2.id, weekday: 6, startTime: '10:00', endTime: '14:00', timezone: 'Europe/Moscow' },
  ];
  await prisma.availabilityRule.createMany({ data: rules });
  console.log(`✓ Availability rules: ${rules.length}`);

  // Generate slots for next 14 days
  const today = startOfDay(new Date());
  const slotDuration = 60;
  const slotsData = [];

  for (const rule of rules) {
    const fromDate = addDays(today, 1);
    const toDate = addDays(today, 14);

    for (let d = new Date(fromDate); d <= toDate; d = addDays(d, 1)) {
      const weekday = getWeekday(d);
      if (rule.weekday !== weekday) continue;

      const [startHour, startMin] = rule.startTime.split(':').map(Number);
      const [endHour, endMin] = rule.endTime.split(':').map(Number);

      // Create local time in Moscow (UTC+3)
      const localStart = new Date(d);
      localStart.setHours(startHour, startMin, 0, 0);
      const localEnd = new Date(d);
      localEnd.setHours(endHour, endMin, 0, 0);

      let slotStart = fromMoscowTime(localStart);
      const windowEnd = fromMoscowTime(localEnd);

      while (slotStart.getTime() + slotDuration * 60 * 1000 <= windowEnd.getTime()) {
        const slotEnd = addMinutes(slotStart, slotDuration);
        slotsData.push({
          mentorId: rule.mentorId,
          startAt: new Date(slotStart),
          endAt: new Date(slotEnd),
          status: 'free',
        });
        slotStart = slotEnd;
      }
    }
  }

  await prisma.slot.createMany({ data: slotsData });
  console.log(`✓ Slots: ${slotsData.length}`);

  console.log('\n✅ Seed done!');
  console.log('  danil.rastyapin@example.com / password123');
  console.log('  alex.mentor@example.com / password123');
  console.log('  maria.mentor@example.com / password123');
  console.log('  ivan.mentee@example.com / password123');
  console.log('  anna.mentee@example.com / password123');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
