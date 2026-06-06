// ============================================
// Mentory Seed Script
// ============================================
// Creates realistic demo data for development and supervised demos.
// Run: pnpm --filter @mentory/api seed

import {
  CreditTransactionStatus,
  CreditTransactionType,
  MentorshipSubscriptionStatus,
  PaymentStatus,
  PrismaClient,
  SessionStatus,
  SlotStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { addDays, addMinutes, isAfter, startOfDay, subDays } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

type DemoMentor = {
  email: string;
  username: string;
  fullName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  headline: string;
  bio: string;
  education: string;
  position: string;
  workplace: string;
  activityFields: string[];
  skills: string[];
  hobbies: string[];
  languages: string[];
  topics: string[];
  services: Array<{ title: string; durationMin: number; priceAmount: number }>;
  plans: Array<{ title: string; description: string; priceAmount: number; callsPerMonth: number; sessionDurationMin: number }>;
  ratingAvg: number;
  ratingCount: number;
  schedule: Array<{ weekdays: number[]; startTime: string; endTime: string }>;
};

type DemoMentee = {
  email: string;
  username: string;
  fullName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  education: string;
  position: string;
  workplace: string;
  activityFields: string[];
  background: string;
  goals: string[];
  skills: string[];
  hobbies: string[];
  interests: string[];
};

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function getWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

const topicNames = [
  'Backend Development',
  'Frontend Development',
  'System Design',
  'Career Growth',
  'Product Management',
  'Data Science',
  'DevOps & Infrastructure',
  'Startup & Entrepreneurship',
  'UX Research',
  'Business Analytics',
  'QA & Test Automation',
  'Leadership',
  'Finance & Career',
  'Mobile Development',
];

const demoMentors: DemoMentor[] = [
  {
    email: 'alex.mentor@example.com',
    username: 'alex_mentor',
    fullName: 'Алексей Петров',
    firstName: 'Алексей',
    lastName: 'Петров',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=480&q=80',
    headline: 'Senior Software Engineer @ Yandex',
    bio: 'Более 10 лет в backend-разработке. Помогаю расти от junior до senior и разбирать архитектуру высоконагруженных систем простым языком.',
    education: 'МФТИ, прикладная математика и информатика',
    position: 'Senior Software Engineer',
    workplace: 'Yandex',
    activityFields: ['Backend', 'System Design', 'DevOps'],
    skills: ['Node.js', 'PostgreSQL', 'System Design', 'Kubernetes', 'Highload'],
    hobbies: ['Бег', 'Шахматы', 'Технические подкасты'],
    languages: ['Русский', 'English'],
    topics: ['Backend Development', 'System Design', 'DevOps & Infrastructure'],
    services: [
      { title: 'Разбор кода', durationMin: 45, priceAmount: 3000 },
      { title: 'Карьерная консультация', durationMin: 60, priceAmount: 4500 },
      { title: 'Подготовка к System Design', durationMin: 90, priceAmount: 6000 },
    ],
    plans: [
      {
        title: 'Senior Backend Fast Track',
        description: '3 созвона в месяц, ревью архитектуры и персональный план роста.',
        priceAmount: 12000,
        callsPerMonth: 3,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.85,
    ratingCount: 47,
    schedule: [{ weekdays: [1, 2, 3, 4, 5], startTime: '10:00', endTime: '13:00' }],
  },
  {
    email: 'maria.mentor@example.com',
    username: 'maria_mentor',
    fullName: 'Мария Иванова',
    firstName: 'Мария',
    lastName: 'Иванова',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=480&q=80',
    headline: 'Engineering Manager @ VK',
    bio: 'Прошла путь от разработчика до Engineering Manager. Помогаю с ростом, переходом в менеджмент и коммуникацией с командой.',
    education: 'ВШЭ, управление продуктами и командами',
    position: 'Engineering Manager',
    workplace: 'VK',
    activityFields: ['Career Growth', 'Product Management', 'Leadership'],
    skills: ['People Management', 'Product Strategy', '1:1', 'Roadmap', 'Hiring'],
    hobbies: ['Путешествия', 'Настольные игры', 'Йога'],
    languages: ['Русский', 'English', 'Deutsch'],
    topics: ['Career Growth', 'Product Management', 'Startup & Entrepreneurship', 'Leadership'],
    services: [
      { title: 'Карьерный разбор', durationMin: 60, priceAmount: 5000 },
      { title: 'Переход в менеджмент', durationMin: 60, priceAmount: 5500 },
      { title: 'Мок-интервью по soft skills', durationMin: 45, priceAmount: 4000 },
    ],
    plans: [
      {
        title: 'Переход в Engineering Management',
        description: '4 созвона в месяц: 1:1, hiring, performance review и работа со стейкхолдерами.',
        priceAmount: 15000,
        callsPerMonth: 4,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.92,
    ratingCount: 63,
    schedule: [{ weekdays: [2, 3, 4, 5, 6], startTime: '18:00', endTime: '21:00' }],
  },
  {
    email: 'artem.ba@example.com',
    username: 'artem_ba',
    fullName: 'Артем Мошенко',
    firstName: 'Артем',
    lastName: 'Мошенко',
    avatarUrl: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=480&q=80',
    headline: 'Бизнес-аналитик @ Axenix',
    bio: 'Помогаю входить в бизнес-анализ: интервью, кейсы, BPMN/UML, коммуникация с заказчиками и первые проекты.',
    education: 'НИУ ВШЭ, бизнес-информатика',
    position: 'Бизнес-аналитик',
    workplace: 'Axenix',
    activityFields: ['Business Analytics', 'Consulting'],
    skills: ['BPMN', 'UML', 'SQL', 'PowerPoint', 'Stakeholder Management'],
    hobbies: ['Теннис', 'Настольные игры', 'Покер'],
    languages: ['Русский'],
    topics: ['Business Analytics', 'Career Growth', 'Product Management'],
    services: [
      { title: 'Мок-собеседование на бизнес-аналитика', durationMin: 60, priceAmount: 1000 },
      { title: 'Разбор резюме аналитика', durationMin: 45, priceAmount: 1500 },
    ],
    plans: [
      {
        title: 'Стандартный план аналитика',
        description: '3 сессии, поддержка в чате и разбор учебных/рабочих кейсов.',
        priceAmount: 4000,
        callsPerMonth: 3,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.8,
    ratingCount: 1,
    schedule: [{ weekdays: [1, 3, 5], startTime: '08:00', endTime: '11:00' }],
  },
  {
    email: 'daria.product@example.com',
    username: 'daria_product',
    fullName: 'Дарья Смирнова',
    firstName: 'Дарья',
    lastName: 'Смирнова',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=480&q=80',
    headline: 'Product Lead @ Ozon',
    bio: 'Помогаю продактам структурировать discovery, метрики, roadmap и подготовку к собеседованиям.',
    education: 'СПбГУ, менеджмент',
    position: 'Product Lead',
    workplace: 'Ozon',
    activityFields: ['Product', 'Growth', 'Marketplace'],
    skills: ['Product Discovery', 'Metrics', 'A/B tests', 'Roadmap', 'Unit Economics'],
    hobbies: ['Фотография', 'Бег', 'Кино'],
    languages: ['Русский', 'English'],
    topics: ['Product Management', 'Startup & Entrepreneurship', 'UX Research'],
    services: [
      { title: 'Разбор продуктового кейса', durationMin: 60, priceAmount: 4500 },
      { title: 'Подготовка к product interview', durationMin: 90, priceAmount: 7000 },
    ],
    plans: [
      {
        title: 'Product Growth Sprint',
        description: '4 недели фокуса: цели, метрики, roadmap и weekly review.',
        priceAmount: 18000,
        callsPerMonth: 4,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.9,
    ratingCount: 31,
    schedule: [{ weekdays: [1, 2, 4], startTime: '16:00', endTime: '20:00' }],
  },
  {
    email: 'nikita.frontend@example.com',
    username: 'nikita_frontend',
    fullName: 'Никита Орлов',
    firstName: 'Никита',
    lastName: 'Орлов',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=480&q=80',
    headline: 'Frontend Architect @ Tinkoff',
    bio: 'Разбираю frontend-архитектуру, TypeScript, performance, дизайн-системы и рост до senior.',
    education: 'ИТМО, программная инженерия',
    position: 'Frontend Architect',
    workplace: 'Tinkoff',
    activityFields: ['Frontend', 'Design Systems'],
    skills: ['TypeScript', 'Svelte', 'React', 'Performance', 'Accessibility'],
    hobbies: ['Музыка', 'Велосипед', 'Подкасты'],
    languages: ['Русский', 'English'],
    topics: ['Frontend Development', 'System Design', 'Career Growth'],
    services: [
      { title: 'Frontend code review', durationMin: 60, priceAmount: 4200 },
      { title: 'Архитектура SPA', durationMin: 90, priceAmount: 6800 },
    ],
    plans: [
      {
        title: 'Frontend Senior Plan',
        description: 'План роста, ревью кода и еженедельные архитектурные разборы.',
        priceAmount: 16000,
        callsPerMonth: 4,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.87,
    ratingCount: 28,
    schedule: [{ weekdays: [2, 4, 6], startTime: '11:00', endTime: '15:00' }],
  },
  {
    email: 'elena.data@example.com',
    username: 'elena_data',
    fullName: 'Елена Волкова',
    firstName: 'Елена',
    lastName: 'Волкова',
    avatarUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=480&q=80',
    headline: 'Data Scientist @ Sber',
    bio: 'Помогаю с ML-проектами, аналитикой, портфолио и переходом из аналитика в data science.',
    education: 'МГУ, вычислительная математика',
    position: 'Data Scientist',
    workplace: 'Sber',
    activityFields: ['Data Science', 'Analytics'],
    skills: ['Python', 'ML', 'Pandas', 'Statistics', 'Experiment Design'],
    hobbies: ['Йога', 'Книги', 'Горные лыжи'],
    languages: ['Русский', 'English'],
    topics: ['Data Science', 'Career Growth', 'Business Analytics'],
    services: [
      { title: 'Разбор ML-проекта', durationMin: 60, priceAmount: 4800 },
      { title: 'Портфолио Data Scientist', durationMin: 75, priceAmount: 5600 },
    ],
    plans: [
      {
        title: 'Data Career Track',
        description: 'Портфолио, учебный план и подготовка к интервью в data-команды.',
        priceAmount: 17000,
        callsPerMonth: 4,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.78,
    ratingCount: 22,
    schedule: [{ weekdays: [1, 3, 5], startTime: '15:00', endTime: '19:00' }],
  },
  {
    email: 'sergey.devops@example.com',
    username: 'sergey_devops',
    fullName: 'Сергей Ким',
    firstName: 'Сергей',
    lastName: 'Ким',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=480&q=80',
    headline: 'DevOps Lead @ Avito',
    bio: 'Объясняю инфраструктуру без магии: Docker, Kubernetes, CI/CD, мониторинг и надежность сервисов.',
    education: 'МГТУ им. Баумана, ИУ',
    position: 'DevOps Lead',
    workplace: 'Avito',
    activityFields: ['DevOps', 'SRE'],
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'Observability', 'Linux'],
    hobbies: ['Скалолазание', 'Шахматы', 'Кулинария'],
    languages: ['Русский', 'English'],
    topics: ['DevOps & Infrastructure', 'System Design', 'Backend Development'],
    services: [
      { title: 'Разбор CI/CD', durationMin: 60, priceAmount: 5000 },
      { title: 'Kubernetes консультация', durationMin: 90, priceAmount: 7500 },
    ],
    plans: [
      {
        title: 'DevOps Practice',
        description: 'Практический план по контейнерам, деплою и мониторингу.',
        priceAmount: 19000,
        callsPerMonth: 4,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.83,
    ratingCount: 35,
    schedule: [{ weekdays: [2, 3, 5], startTime: '09:00', endTime: '12:00' }],
  },
  {
    email: 'olga.ux@example.com',
    username: 'olga_ux',
    fullName: 'Ольга Белова',
    firstName: 'Ольга',
    lastName: 'Белова',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=480&q=80',
    headline: 'UX Researcher @ Miro',
    bio: 'Помогаю исследователям и продактам проводить интервью, строить CJM и превращать инсайты в решения.',
    education: 'Британская высшая школа дизайна',
    position: 'UX Researcher',
    workplace: 'Miro',
    activityFields: ['UX Research', 'Product'],
    skills: ['User Interviews', 'CJM', 'Jobs To Be Done', 'Usability Testing', 'Research Ops'],
    hobbies: ['Рисование', 'Керамика', 'Путешествия'],
    languages: ['Русский', 'English'],
    topics: ['UX Research', 'Product Management', 'Startup & Entrepreneurship'],
    services: [
      { title: 'План исследования', durationMin: 60, priceAmount: 4300 },
      { title: 'Разбор CJM', durationMin: 75, priceAmount: 5200 },
    ],
    plans: [
      {
        title: 'UX Research Starter',
        description: 'Сопровождение первого исследования от гипотез до выводов.',
        priceAmount: 14000,
        callsPerMonth: 3,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.88,
    ratingCount: 19,
    schedule: [{ weekdays: [1, 4, 6], startTime: '12:00', endTime: '16:00' }],
  },
  {
    email: 'igor.qa@example.com',
    username: 'igor_qa',
    fullName: 'Игорь Соколов',
    firstName: 'Игорь',
    lastName: 'Соколов',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80',
    headline: 'QA Automation Lead @ Lamoda',
    bio: 'Помогаю QA-инженерам перейти в автоматизацию, выстроить тест-стратегию и говорить с разработкой на одном языке.',
    education: 'МИРЭА, прикладная информатика',
    position: 'QA Automation Lead',
    workplace: 'Lamoda',
    activityFields: ['QA', 'Automation'],
    skills: ['Playwright', 'API Testing', 'Test Strategy', 'TypeScript', 'CI'],
    hobbies: ['Футбол', 'Кино', 'Настольные игры'],
    languages: ['Русский'],
    topics: ['QA & Test Automation', 'Frontend Development', 'Career Growth'],
    services: [
      { title: 'Переход в QA automation', durationMin: 60, priceAmount: 3500 },
      { title: 'Разбор тестового задания', durationMin: 60, priceAmount: 3800 },
    ],
    plans: [
      {
        title: 'QA Automation Roadmap',
        description: 'План обучения, практика и ревью тестов каждую неделю.',
        priceAmount: 11000,
        callsPerMonth: 3,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.74,
    ratingCount: 16,
    schedule: [{ weekdays: [2, 5], startTime: '17:00', endTime: '21:00' }],
  },
  {
    email: 'polina.mobile@example.com',
    username: 'polina_mobile',
    fullName: 'Полина Романова',
    firstName: 'Полина',
    lastName: 'Романова',
    avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=480&q=80',
    headline: 'iOS Engineer @ Kaspersky',
    bio: 'Консультирую по мобильной разработке, Swift, архитектуре приложений и подготовке к iOS-интервью.',
    education: 'СПбПУ, программная инженерия',
    position: 'iOS Engineer',
    workplace: 'Kaspersky',
    activityFields: ['Mobile', 'iOS'],
    skills: ['Swift', 'UIKit', 'SwiftUI', 'Mobile Architecture', 'App Store'],
    hobbies: ['Бег', 'Фотография', 'Музыка'],
    languages: ['Русский', 'English'],
    topics: ['Mobile Development', 'Career Growth', 'System Design'],
    services: [
      { title: 'iOS interview prep', durationMin: 60, priceAmount: 4700 },
      { title: 'Архитектура мобильного приложения', durationMin: 90, priceAmount: 7200 },
    ],
    plans: [
      {
        title: 'Mobile Engineer Growth',
        description: 'Практика архитектуры, ревью кода и подготовка к интервью.',
        priceAmount: 16500,
        callsPerMonth: 4,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.81,
    ratingCount: 21,
    schedule: [{ weekdays: [3, 4, 6], startTime: '10:00', endTime: '14:00' }],
  },
  {
    email: 'max.startup@example.com',
    username: 'max_startup',
    fullName: 'Максим Громов',
    firstName: 'Максим',
    lastName: 'Громов',
    avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=480&q=80',
    headline: 'Founder & ex-Product @ Skyeng',
    bio: 'Помогаю основателям проверять гипотезы, считать экономику, собирать первые продажи и не строить лишнее.',
    education: 'РЭШ, экономика',
    position: 'Founder',
    workplace: 'EdTech startup',
    activityFields: ['Startup', 'Product', 'Sales'],
    skills: ['MVP', 'Go-to-market', 'Unit Economics', 'Fundraising', 'Sales'],
    hobbies: ['Серфинг', 'Книги', 'Пешие походы'],
    languages: ['Русский', 'English'],
    topics: ['Startup & Entrepreneurship', 'Product Management', 'Finance & Career'],
    services: [
      { title: 'Разбор идеи стартапа', durationMin: 60, priceAmount: 6000 },
      { title: 'Юнит-экономика и первые продажи', durationMin: 90, priceAmount: 9000 },
    ],
    plans: [
      {
        title: 'MVP за 6 недель',
        description: 'Еженедельные созвоны, фокус на гипотезы, продажи и метрики.',
        priceAmount: 24000,
        callsPerMonth: 4,
        sessionDurationMin: 75,
      },
    ],
    ratingAvg: 4.95,
    ratingCount: 42,
    schedule: [{ weekdays: [1, 3], startTime: '19:00', endTime: '22:00' }],
  },
  {
    email: 'anna.finance@example.com',
    username: 'anna_finance',
    fullName: 'Анна Морозова',
    firstName: 'Анна',
    lastName: 'Морозова',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=480&q=80',
    headline: 'Financial Analyst @ Альфа-Банк',
    bio: 'Помогаю с финансовым моделированием, подготовкой к кейс-интервью и переходом в корпоративные финансы.',
    education: 'Финансовый университет',
    position: 'Financial Analyst',
    workplace: 'Альфа-Банк',
    activityFields: ['Finance', 'Analytics'],
    skills: ['Excel', 'Financial Modeling', 'Valuation', 'PowerPoint', 'Case Interview'],
    hobbies: ['Театр', 'Кулинария', 'Йога'],
    languages: ['Русский', 'English'],
    topics: ['Finance & Career', 'Business Analytics', 'Career Growth'],
    services: [
      { title: 'Финансовая модель', durationMin: 75, priceAmount: 5200 },
      { title: 'Кейс-интервью в финансы', durationMin: 60, priceAmount: 4500 },
    ],
    plans: [
      {
        title: 'Finance Interview Pack',
        description: 'Подготовка к интервью, модели, кейсы и резюме.',
        priceAmount: 13000,
        callsPerMonth: 3,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.76,
    ratingCount: 14,
    schedule: [{ weekdays: [2, 4], startTime: '18:00', endTime: '21:00' }],
  },
  {
    email: 'viktor.arch@example.com',
    username: 'viktor_arch',
    fullName: 'Виктор Баринов',
    firstName: 'Виктор',
    lastName: 'Баринов',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=480&q=80',
    headline: 'Solution Architect @ МТС',
    bio: 'Разбираю архитектуру систем, интеграции, очереди, API contracts и подготовку к архитектурным интервью.',
    education: 'МГТУ им. Баумана, информатика',
    position: 'Solution Architect',
    workplace: 'МТС',
    activityFields: ['Architecture', 'Enterprise'],
    skills: ['Architecture', 'Kafka', 'API Design', 'DDD', 'Integration Patterns'],
    hobbies: ['Гитара', 'История', 'Волонтерство'],
    languages: ['Русский', 'English'],
    topics: ['System Design', 'Backend Development', 'DevOps & Infrastructure'],
    services: [
      { title: 'Архитектурный разбор проекта', durationMin: 90, priceAmount: 8500 },
      { title: 'API и интеграции', durationMin: 60, priceAmount: 6200 },
    ],
    plans: [
      {
        title: 'Architecture Mentoring',
        description: 'Системный план роста в архитектуру: схемы, решения, ревью.',
        priceAmount: 22000,
        callsPerMonth: 4,
        sessionDurationMin: 75,
      },
    ],
    ratingAvg: 4.89,
    ratingCount: 38,
    schedule: [{ weekdays: [1, 5], startTime: '11:00', endTime: '16:00' }],
  },
  {
    email: 'renata.hr@example.com',
    username: 'renata_hr',
    fullName: 'Рената Малеванная',
    firstName: 'Рената',
    lastName: 'Малеванная',
    avatarUrl: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=480&q=80',
    headline: 'Career Coach for IT',
    bio: 'Помогаю готовить резюме, проходить интервью, вести переговоры о зарплате и выбирать следующий шаг в карьере.',
    education: 'МГУ, психология',
    position: 'Career Coach',
    workplace: 'Independent',
    activityFields: ['Career', 'HR', 'Negotiation'],
    skills: ['Resume Review', 'Interview Prep', 'Negotiation', 'Career Strategy', 'LinkedIn'],
    hobbies: ['Чтение', 'Пилатес', 'Психология'],
    languages: ['Русский', 'English'],
    topics: ['Career Growth', 'Leadership', 'Finance & Career'],
    services: [
      { title: 'Разбор резюме', durationMin: 45, priceAmount: 2500 },
      { title: 'Стратегия поиска работы', durationMin: 60, priceAmount: 4000 },
    ],
    plans: [
      {
        title: 'Оффер за 8 недель',
        description: 'Резюме, отклики, интервью, переговоры и сопровождение до оффера.',
        priceAmount: 15000,
        callsPerMonth: 4,
        sessionDurationMin: 45,
      },
    ],
    ratingAvg: 4.91,
    ratingCount: 54,
    schedule: [{ weekdays: [2, 3, 4], startTime: '09:00', endTime: '12:00' }],
  },
  {
    email: 'gleb.backend@example.com',
    username: 'gleb_backend',
    fullName: 'Глеб Плаксин',
    firstName: 'Глеб',
    lastName: 'Плаксин',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=480&q=80',
    headline: 'Go Backend Engineer @ Wildberries',
    bio: 'Помогаю backend-разработчикам с Go, микросервисами, очередями, БД и подготовкой к собеседованиям.',
    education: 'НИУ ВШЭ, программная инженерия',
    position: 'Backend Engineer',
    workplace: 'Wildberries',
    activityFields: ['Backend', 'Go', 'Marketplace'],
    skills: ['Go', 'PostgreSQL', 'Kafka', 'Redis', 'Microservices'],
    hobbies: ['Бокс', 'Компьютерные игры', 'Музыка'],
    languages: ['Русский'],
    topics: ['Backend Development', 'System Design', 'Career Growth'],
    services: [
      { title: 'Go backend консультация', durationMin: 60, priceAmount: 3900 },
      { title: 'Мок-интервью backend', durationMin: 75, priceAmount: 5200 },
    ],
    plans: [
      {
        title: 'Backend Middle Track',
        description: 'План роста, задачи, разбор архитектуры и собеседований.',
        priceAmount: 12500,
        callsPerMonth: 3,
        sessionDurationMin: 60,
      },
    ],
    ratingAvg: 4.71,
    ratingCount: 12,
    schedule: [{ weekdays: [1, 4], startTime: '18:00', endTime: '22:00' }],
  },
];

const demoMentees: DemoMentee[] = [
  {
    email: 'ivan.mentee@example.com',
    username: 'ivan_mentee',
    fullName: 'Иван Сидоров',
    firstName: 'Иван',
    lastName: 'Сидоров',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=480&q=80',
    education: 'ИТМО, программная инженерия',
    position: 'Junior Backend Developer',
    workplace: 'Fintech Lab',
    activityFields: ['Backend', 'Databases'],
    background: 'Junior Backend Developer, 1.5 года опыта. Работаю с Node.js и PostgreSQL.',
    goals: ['Вырасти до Middle/Senior уровня', 'Улучшить архитектурное мышление'],
    skills: ['Node.js', 'SQL', 'Docker'],
    hobbies: ['Бег', 'Книги', 'Настольные игры'],
    interests: ['Backend', 'System Design', 'Databases'],
  },
  {
    email: 'anna.mentee@example.com',
    username: 'anna_mentee',
    fullName: 'Анна Козлова',
    firstName: 'Анна',
    lastName: 'Козлова',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=480&q=80',
    education: 'СПбГУ, прикладная информатика',
    position: 'Middle Frontend Developer',
    workplace: 'RetailTech',
    activityFields: ['Frontend', 'Product'],
    background: 'Middle Frontend Developer, 3 года опыта. React, TypeScript.',
    goals: ['Перейти в Product Management', 'Понять роль и подготовиться к интервью'],
    skills: ['React', 'TypeScript', 'UX Research'],
    hobbies: ['Фотография', 'Йога', 'Подкасты'],
    interests: ['Product Management', 'Career', 'Leadership'],
  },
  {
    email: 'pavel.mentee@example.com',
    username: 'pavel_mentee',
    fullName: 'Павел Никитин',
    firstName: 'Павел',
    lastName: 'Никитин',
    avatarUrl: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=480&q=80',
    education: 'РАНХиГС, бизнес-информатика',
    position: 'Junior Business Analyst',
    workplace: 'Retail Systems',
    activityFields: ['Business Analytics'],
    background: 'Начинающий аналитик, хочу лучше проходить кейс-интервью и писать требования.',
    goals: ['Подготовиться к интервью', 'Научиться описывать процессы'],
    skills: ['BPMN', 'Excel', 'SQL'],
    hobbies: ['Теннис', 'Кино', 'Настольные игры'],
    interests: ['Business Analytics', 'Product Management'],
  },
];

async function main() {
  console.log('Starting seed...');

  console.log('Cleaning existing data...');
  await prisma.platformWithdrawal.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.userBlock.deleteMany();
  await prisma.moderationAction.deleteMany();
  await prisma.mentorRegalia.deleteMany();
  await prisma.complaintMessage.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.userAgreement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.mentorshipBookmark.deleteMany();
  await prisma.mentorshipTask.deleteMany();
  await prisma.mentorshipSubscription.deleteMany();
  await prisma.mentorshipPlan.deleteMany();
  await prisma.menteeCreditTransaction.deleteMany();
  await prisma.menteeCreditBalance.deleteMany();
  await prisma.sessionNote.deleteMany();
  await prisma.videoRoom.deleteMany();
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

  const userPasswordHash = await hashPassword('password123');
  const adminPasswordHash = await hashPassword('change-me-admin');

  console.log('Creating topics...');
  const topics = await Promise.all(topicNames.map((name) => prisma.topic.create({ data: { name } })));
  const topicByName = new Map(topics.map((topic) => [topic.name, topic]));

  console.log('Creating admin...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@mentory.local',
      username: 'admin',
      passwordHash: adminPasswordHash,
      fullName: 'Администратор Mentory',
      firstName: 'Администратор',
      lastName: 'Mentory',
      timezone: 'Europe/Moscow',
      role: UserRole.admin,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log('Creating mentors...');
  const mentors = [];
  const servicesByMentor = new Map<string, Array<{ id: string; title: string; priceAmount: number }>>();
  const plansByMentor = new Map<string, Array<{ id: string; title: string; priceAmount: number }>>();

  for (const demo of demoMentors) {
    const mentor = await prisma.user.create({
      data: {
        email: demo.email,
        username: demo.username,
        passwordHash: userPasswordHash,
        fullName: demo.fullName,
        firstName: demo.firstName,
        lastName: demo.lastName,
        avatarUrl: demo.avatarUrl,
        timezone: 'Europe/Moscow',
        role: UserRole.mentor,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        mentorProfile: {
          create: {
            headline: demo.headline,
            bio: demo.bio,
            education: demo.education,
            position: demo.position,
            workplace: demo.workplace,
            activityFields: demo.activityFields,
            skills: demo.skills,
            hobbies: demo.hobbies,
            languages: demo.languages,
            timezone: 'Europe/Moscow',
            verificationStatus: 'verified',
            isActive: true,
            ratingAvg: demo.ratingAvg,
            ratingCount: demo.ratingCount,
          },
        },
      },
    });

    mentors.push(mentor);

    await prisma.mentorTopic.createMany({
      data: demo.topics
        .map((topicName) => topicByName.get(topicName))
        .filter(Boolean)
        .map((topic) => ({ mentorId: mentor.id, topicId: topic!.id })),
    });

    const createdServices = [];
    for (const service of demo.services) {
      const created = await prisma.mentorService.create({
        data: {
          mentorId: mentor.id,
          title: service.title,
          durationMin: service.durationMin,
          priceAmount: service.priceAmount,
          currency: 'RUB',
          isActive: true,
        },
      });
      createdServices.push({ id: created.id, title: created.title, priceAmount: service.priceAmount });
    }
    servicesByMentor.set(mentor.id, createdServices);

    const createdPlans = [];
    for (const plan of demo.plans) {
      const created = await prisma.mentorshipPlan.create({
        data: {
          mentorId: mentor.id,
          title: plan.title,
          description: plan.description,
          priceAmount: plan.priceAmount,
          currency: 'RUB',
          billingIntervalMonths: 1,
          callsPerMonth: plan.callsPerMonth,
          sessionDurationMin: plan.sessionDurationMin,
          responseTimeHours: 24,
          includesUnlimitedChat: true,
        },
      });
      createdPlans.push({ id: created.id, title: created.title, priceAmount: plan.priceAmount });
    }
    plansByMentor.set(mentor.id, createdPlans);

    await prisma.mentorRegalia.create({
      data: {
        mentorId: mentor.id,
        title: `${demo.workplace}: подтверждение опыта`,
        fileUrl: `/uploads/demo/${demo.username}-experience.pdf`,
        fileName: `${demo.username}-experience.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: BigInt(524288),
        status: 'approved',
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    for (const block of demo.schedule) {
      await prisma.availabilityRule.createMany({
        data: block.weekdays.map((weekday) => ({
          mentorId: mentor.id,
          weekday,
          startTime: block.startTime,
          endTime: block.endTime,
          timezone: 'Europe/Moscow',
        })),
      });
    }
  }

  console.log('Creating mentees...');
  const mentees = [];
  for (const demo of demoMentees) {
    const mentee = await prisma.user.create({
      data: {
        email: demo.email,
        username: demo.username,
        passwordHash: userPasswordHash,
        fullName: demo.fullName,
        firstName: demo.firstName,
        lastName: demo.lastName,
        avatarUrl: demo.avatarUrl,
        timezone: 'Europe/Moscow',
        role: UserRole.mentee,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        menteeProfile: {
          create: {
            education: demo.education,
            position: demo.position,
            workplace: demo.workplace,
            activityFields: demo.activityFields,
            background: demo.background,
            goals: demo.goals,
            skills: demo.skills,
            hobbies: demo.hobbies,
            interests: demo.interests,
          },
        },
      },
    });
    mentees.push(mentee);
  }

  await prisma.userAgreement.createMany({
    data: [admin.id, ...mentors.map((mentor) => mentor.id), ...mentees.map((mentee) => mentee.id)].map((userId) => ({
      userId,
      documentType: 'terms',
      documentVersion: '1.0',
    })),
  });

  console.log('Generating free slots...');
  const today = startOfDay(new Date());
  const slotDuration = 60;
  const slotsData: { mentorId: string; startAt: Date; endAt: Date; status: SlotStatus }[] = [];
  const rules = await prisma.availabilityRule.findMany();
  const fromDate = addDays(today, 1);
  const toDate = addDays(today, 14);

  for (const rule of rules) {
    const ruleTz = rule.timezone || 'UTC';
    const fromZoned = startOfDay(toZonedTime(fromDate, ruleTz));
    const toZoned = startOfDay(toZonedTime(toDate, ruleTz));

    for (let d = fromZoned; !isAfter(d, toZoned); d = addDays(d, 1)) {
      if (rule.weekday !== getWeekday(d)) continue;

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

  console.log('Creating demo sessions and conversations...');
  const demoSessionSpecs = [
    { mentor: 2, mentee: 2, service: 0, status: SessionStatus.paid, date: addDays(today, 2), hour: 8, goal: 'Подготовиться к интервью бизнес-аналитика' },
    { mentor: 1, mentee: 0, service: 2, status: SessionStatus.requested, date: addDays(today, 3), hour: 18, goal: 'Понять, как пройти behavioral interview' },
    { mentor: 0, mentee: 0, service: 1, status: SessionStatus.booked, date: addDays(today, 4), hour: 11, goal: 'Разобрать карьерный план backend-разработчика' },
    { mentor: 3, mentee: 1, service: 0, status: SessionStatus.requested, date: addDays(today, 1), hour: 16, goal: 'Разобрать продуктовый кейс' },
    { mentor: 4, mentee: 1, service: 0, status: SessionStatus.completed, date: subDays(today, 3), hour: 12, goal: 'Понять слабые места во frontend-коде' },
    { mentor: 6, mentee: 0, service: 0, status: SessionStatus.rejected, date: subDays(today, 1), hour: 10, goal: 'Проверить CI/CD пайплайн' },
  ];

  const createdSessions = [];
  for (const spec of demoSessionSpecs) {
    const mentor = mentors[spec.mentor];
    const mentee = mentees[spec.mentee];
    const service = servicesByMentor.get(mentor.id)?.[spec.service] || servicesByMentor.get(mentor.id)?.[0];
    if (!service) continue;

    const startAt = new Date(spec.date);
    startAt.setHours(spec.hour, 0, 0, 0);
    const endAt = addMinutes(startAt, 60);
    const slot = await prisma.slot.create({
      data: {
        mentorId: mentor.id,
        startAt,
        endAt,
        status: SlotStatus.booked,
      },
    });

    const hasDecision =
      spec.status === SessionStatus.booked ||
      spec.status === SessionStatus.completed ||
      spec.status === SessionStatus.rejected;
    const hasMeetingLink = spec.status === SessionStatus.booked || spec.status === SessionStatus.completed;

    const session = await prisma.session.create({
      data: {
        mentorId: mentor.id,
        menteeId: mentee.id,
        serviceId: service.id,
        slotId: slot.id,
        status: spec.status,
        startAt,
        endAt,
        requestGoal: spec.goal,
        requestMotivation: 'Хочу получить практический разбор и понятные следующие шаги.',
        decisionComment: spec.status === SessionStatus.rejected ? 'Не смогу помочь по этой теме в выбранное время.' : null,
        decidedAt: hasDecision ? new Date() : null,
        videoLink: hasMeetingLink ? 'https://zoom.us/j/123456789' : null,
      },
    });
    createdSessions.push({ session, mentor, mentee, service });

    if (spec.status === SessionStatus.paid || spec.status === SessionStatus.booked || spec.status === SessionStatus.completed) {
      await prisma.payment.create({
        data: {
          sessionId: session.id,
          menteeId: mentee.id,
          mentorId: mentor.id,
          provider: 'mock',
          amount: service.priceAmount * 100,
          platformFee: Math.round(service.priceAmount * 100 * 0.15),
          mentorAmount: Math.round(service.priceAmount * 100 * 0.85),
          currency: 'RUB',
          status: PaymentStatus.succeeded,
          providerPaymentId: `seed_${session.id}`,
          paidAt: new Date(),
        },
      });
    }
  }

  for (const item of createdSessions.slice(0, 4)) {
    const conversation = await prisma.conversation.create({
      data: {
        mentorId: item.mentor.id,
        menteeId: item.mentee.id,
        sessionId: item.session.id,
      },
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: item.mentee.id,
        content: `Здравствуйте! Хочу обсудить: ${item.session.requestGoal}`,
      },
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: item.mentor.id,
        content: 'Привет! Посмотрю заявку и предложу понятный план встречи.',
      },
    });
  }

  const completed = createdSessions.find((item) => item.session.status === SessionStatus.completed);
  if (completed) {
    await prisma.review.create({
      data: {
        sessionId: completed.session.id,
        menteeId: completed.mentee.id,
        mentorId: completed.mentor.id,
        rating: 5,
        text: 'Ментор помог быстро увидеть слабые места и дал конкретный план роста.',
      },
    });
  }

  console.log('Creating demo subscriptions and balance...');
  const maria = mentors.find((mentor) => mentor.email === 'maria.mentor@example.com')!;
  const alex = mentors.find((mentor) => mentor.email === 'alex.mentor@example.com')!;
  const activePlan = plansByMentor.get(maria.id)?.[0];
  const pendingPlan = plansByMentor.get(alex.id)?.[0];

  if (activePlan) {
    const subscription = await prisma.mentorshipSubscription.create({
      data: {
        mentorId: maria.id,
        menteeId: mentees[0].id,
        planId: activePlan.id,
        status: MentorshipSubscriptionStatus.active,
        monthlyPrice: activePlan.priceAmount,
        currency: 'RUB',
        startedAt: subDays(today, 10),
        currentPeriodStart: subDays(today, 10),
        currentPeriodEnd: addDays(today, 20),
        nextBillingAt: addDays(today, 20),
        requestGoal: 'Перейти в менеджмент без хаоса и потери скорости команды.',
        requestMotivation: 'Нужна регулярная поддержка и обратная связь по рабочим ситуациям.',
      },
    });
    await prisma.mentorshipTask.createMany({
      data: [
        {
          subscriptionId: subscription.id,
          createdById: maria.id,
          assigneeId: mentees[0].id,
          title: 'Сформулировать карьерную цель на квартал',
          description: 'Коротко описать текущую роль, желаемую роль и главные пробелы.',
          status: 'in_progress',
          dueDate: addDays(today, 5),
        },
        {
          subscriptionId: subscription.id,
          createdById: maria.id,
          assigneeId: mentees[0].id,
          title: 'Подготовить список сложных 1:1',
          status: 'todo',
          dueDate: addDays(today, 9),
        },
      ],
    });
    await prisma.mentorshipBookmark.create({
      data: {
        subscriptionId: subscription.id,
        createdById: maria.id,
        title: 'Шаблон карьерного плана',
        description: 'Документ для подготовки к следующей встрече.',
        url: 'https://example.com/mentory-career-plan',
      },
    });
  }

  if (pendingPlan) {
    await prisma.mentorshipSubscription.create({
      data: {
        mentorId: alex.id,
        menteeId: mentees[1].id,
        planId: pendingPlan.id,
        status: MentorshipSubscriptionStatus.pending,
        monthlyPrice: pendingPlan.priceAmount,
        currency: 'RUB',
        requestGoal: 'Подготовиться к system design интервью.',
        requestMotivation: 'Хочу регулярный план и ревью решений.',
      },
    });
  }

  await prisma.menteeCreditBalance.create({
    data: {
      menteeId: mentees[0].id,
      amountCents: 250000,
      currency: 'RUB',
      expiresAt: addDays(today, 180),
    },
  });
  await prisma.menteeCreditTransaction.create({
    data: {
      menteeId: mentees[0].id,
      type: CreditTransactionType.topup,
      status: CreditTransactionStatus.succeeded,
      amountCents: 250000,
      currency: 'RUB',
      description: 'Демо-пополнение бонусного баланса',
      externalRef: 'seed-demo-balance',
      expiresAt: addDays(today, 180),
    },
  });

  console.log('\nSeed completed.');
  console.log(`Topics: ${topics.length}`);
  console.log(`Mentors: ${mentors.length}`);
  console.log(`Mentees: ${mentees.length}`);
  console.log(`Free slots: ${slotsData.length}`);
  console.log(`Demo sessions: ${createdSessions.length}`);
  console.log('\nAccounts:');
  console.log('admin@mentory.local / change-me-admin');
  console.log('alex.mentor@example.com / password123');
  console.log('maria.mentor@example.com / password123');
  console.log('ivan.mentee@example.com / password123');
  console.log('anna.mentee@example.com / password123');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
