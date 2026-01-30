const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  
  // Create mentor user
  const mentor = await prisma.user.upsert({
    where: { email: 'mentor@test.com' },
    update: {},
    create: {
      email: 'mentor@test.com',
      passwordHash: hash,
      fullName: 'Ivan Mentor',
      role: 'mentor',
    },
  });
  
  // Create mentee user
  const mentee = await prisma.user.upsert({
    where: { email: 'mentee@test.com' },
    update: {},
    create: {
      email: 'mentee@test.com',
      passwordHash: hash,
      fullName: 'Anna Mentee',
      role: 'mentee',
    },
  });
  
  // Create topic
  const topic = await prisma.topic.upsert({
    where: { name: 'Programming' },
    update: {},
    create: { name: 'Programming', category: 'IT' }
  });
  
  // Create mentor profile
  await prisma.mentorProfile.upsert({
    where: { userId: mentor.id },
    update: { isActive: true },
    create: {
      userId: mentor.id,
      headline: 'Senior Software Engineer',
      bio: 'Experienced developer with 10+ years in web development.',
      isActive: true,
      ratingAvg: 4.8,
      ratingCount: 25,
    },
  });
  
  // Link mentor to topic
  await prisma.mentorTopic.upsert({
    where: { mentorId_topicId: { mentorId: mentor.id, topicId: topic.id } },
    update: {},
    create: { mentorId: mentor.id, topicId: topic.id }
  });
  
  // Create mentor service
  await prisma.mentorService.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      mentorId: mentor.id,
      title: 'Career Consultation',
      description: 'Resume review, interview prep, career advice',
      priceAmount: 50.00,
      currency: 'USD',
      durationMinutes: 60,
      isActive: true,
    }
  });
  
  console.log('Seed completed!');
  console.log('Users:', mentor.email, mentee.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
