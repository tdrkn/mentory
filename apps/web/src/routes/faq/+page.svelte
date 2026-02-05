<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { ChevronDown, HelpCircle, MessageCircle, CreditCard, Calendar, Shield, Users } from 'lucide-svelte';

  interface FAQItem {
    question: string;
    answer: string;
  }

  interface FAQCategory {
    title: string;
    icon: any;
    items: FAQItem[];
  }

  const faqCategories: FAQCategory[] = [
    {
      title: 'Общие вопросы',
      icon: HelpCircle,
      items: [
        {
          question: 'Что такое Mentory?',
          answer: 'Mentory — это платформа, которая соединяет людей, желающих развиваться профессионально, с опытными экспертами в различных областях. Здесь вы можете найти ментора для карьерных консультаций, обучения новым навыкам или получения экспертного совета.'
        },
        {
          question: 'Как выбрать подходящего ментора?',
          answer: 'Используйте фильтры на странице менторов: выберите интересующую тему, ценовой диапазон и рейтинг. Изучите профиль ментора, его опыт, отзывы других пользователей и доступные услуги. Многие менторы предлагают короткие вводные сессии.'
        },
        {
          question: 'Могу ли я стать ментором?',
          answer: 'Да! Если у вас есть экспертиза в какой-либо области и желание помогать другим, вы можете зарегистрироваться как ментор. Заполните профиль, укажите свои навыки, установите расписание и цены на услуги.'
        }
      ]
    },
    {
      title: 'Сессии и бронирование',
      icon: Calendar,
      items: [
        {
          question: 'Как забронировать сессию?',
          answer: 'Выберите ментора, откройте его профиль, выберите подходящую услугу и доступное время. После бронирования слот удерживается на 10 минут для завершения оплаты. После оплаты вы получите подтверждение и ссылку для видеозвонка.'
        },
        {
          question: 'Как проходит сессия?',
          answer: 'Сессии проводятся через встроенный видеочат платформы. Перед началом вы получите напоминание. Во время сессии вы можете общаться с ментором голосом и видео, обмениваться сообщениями и файлами.'
        },
        {
          question: 'Можно ли перенести или отменить сессию?',
          answer: 'Да, вы можете перенести или отменить сессию за 24 часа до начала без штрафа. При отмене менее чем за 24 часа может взиматься частичная оплата. Детали указаны в условиях конкретного ментора.'
        }
      ]
    },
    {
      title: 'Оплата и возвраты',
      icon: CreditCard,
      items: [
        {
          question: 'Какие способы оплаты принимаются?',
          answer: 'Мы принимаем банковские карты Visa, Mastercard и МИР. Все платежи обрабатываются через защищённый платёжный шлюз. Данные вашей карты не хранятся на наших серверах.'
        },
        {
          question: 'Когда ментор получает оплату?',
          answer: 'Средства замораживаются после бронирования и переводятся ментору после успешного завершения сессии. Это защищает обе стороны и гарантирует качество услуг.'
        },
        {
          question: 'Как получить возврат средств?',
          answer: 'Если сессия не состоялась по вине ментора или была отменена вовремя — возврат производится автоматически в течение 5-7 рабочих дней. В спорных ситуациях обратитесь в поддержку.'
        }
      ]
    },
    {
      title: 'Для менторов',
      icon: Users,
      items: [
        {
          question: 'Какая комиссия платформы?',
          answer: 'Платформа взимает комиссию 15% с каждой успешной сессии. Это покрывает обработку платежей, техническую инфраструктуру и поддержку пользователей.'
        },
        {
          question: 'Как установить расписание?',
          answer: 'В личном кабинете перейдите в раздел "Расписание". Там вы можете добавить доступные слоты, указать их длительность и повторяемость. Также можно установить минимальное время для бронирования.'
        },
        {
          question: 'Как получить больше клиентов?',
          answer: 'Заполните профиль максимально подробно, добавьте профессиональное фото, укажите конкретные достижения. Регулярно обновляйте расписание, отвечайте на сообщения быстро и собирайте отзывы от довольных клиентов.'
        }
      ]
    },
    {
      title: 'Безопасность',
      icon: Shield,
      items: [
        {
          question: 'Как защищены мои данные?',
          answer: 'Мы используем шифрование SSL для всех соединений, не храним данные банковских карт и соблюдаем требования по защите персональных данных. Ваши личные данные никогда не передаются третьим лицам без вашего согласия.'
        },
        {
          question: 'Что делать при проблемах с ментором?',
          answer: 'Если возникли проблемы во время или после сессии, свяжитесь с поддержкой через чат или email. Мы рассмотрим ситуацию и примем меры, включая возврат средств при необходимости.'
        }
      ]
    },
    {
      title: 'Техническая поддержка',
      icon: MessageCircle,
      items: [
        {
          question: 'Не работает видеозвонок, что делать?',
          answer: 'Проверьте разрешения браузера на доступ к камере и микрофону. Убедитесь, что вы используете современный браузер (Chrome, Firefox, Safari). Если проблема сохраняется, попробуйте перезагрузить страницу или использовать другой браузер.'
        },
        {
          question: 'Как связаться с поддержкой?',
          answer: 'Напишите нам на support@mentory.ru или используйте чат в правом нижнем углу экрана. Мы отвечаем в течение 24 часов в рабочие дни.'
        }
      ]
    }
  ];

  let openItems: Record<string, boolean> = {};

  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    const key = `${categoryIndex}-${itemIndex}`;
    openItems[key] = !openItems[key];
    openItems = openItems; // trigger reactivity
  };

  const isOpen = (categoryIndex: number, itemIndex: number) => {
    return openItems[`${categoryIndex}-${itemIndex}`] || false;
  };
</script>

<svelte:head>
  <title>FAQ — Mentory</title>
</svelte:head>

<div class="page">
  <AppHeader />

  <main class="container section">
    <div class="faq-hero reveal">
      <h1 class="section-title" style="font-size:2.5rem;">Часто задаваемые вопросы</h1>
      <p class="section-subtitle" style="max-width:600px;">
        Найдите ответы на популярные вопросы о работе платформы Mentory
      </p>
    </div>

    <div class="faq-content">
      {#each faqCategories as category, categoryIndex}
        <div class="faq-category reveal" style="animation-delay:{categoryIndex * 0.1}s">
          <div class="faq-category-header">
            <div class="faq-category-icon">
              <svelte:component this={category.icon} size={20} />
            </div>
            <h2 class="faq-category-title">{category.title}</h2>
          </div>

          <div class="faq-items">
            {#each category.items as item, itemIndex}
              <div class="faq-item {isOpen(categoryIndex, itemIndex) ? 'open' : ''}">
                <button 
                  class="faq-question"
                  on:click={() => toggleItem(categoryIndex, itemIndex)}
                  aria-expanded={isOpen(categoryIndex, itemIndex)}
                >
                  <span>{item.question}</span>
                  <ChevronDown size={20} class="faq-chevron" />
                </button>
                {#if isOpen(categoryIndex, itemIndex)}
                  <div class="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="faq-cta card reveal">
      <h3>Не нашли ответ на свой вопрос?</h3>
      <p class="muted">Наша команда поддержки готова помочь вам</p>
      <div class="faq-cta-buttons">
        <a href="mailto:support@mentory.ru" class="btn btn-primary">
          <MessageCircle size={18} /> Написать в поддержку
        </a>
        <a href="/mentors" class="btn btn-outline">
          Найти ментора
        </a>
      </div>
    </div>
  </main>
</div>

<style>
  .faq-hero {
    text-align: center;
    padding: 40px 0 48px;
  }

  .faq-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: 800px;
    margin: 0 auto;
  }

  .faq-category {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    overflow: hidden;
  }

  .faq-category-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 24px;
    background: var(--bg-alt);
    border-bottom: 1px solid var(--border);
  }

  .faq-category-icon {
    width: 40px;
    height: 40px;
    background: var(--accent-muted);
    color: var(--accent);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .faq-category-title {
    font-size: 1.1rem;
    margin: 0;
  }

  .faq-items {
    padding: 8px;
  }

  .faq-item {
    border-radius: var(--radius-md);
    transition: background 0.2s ease;
  }

  .faq-item:hover {
    background: var(--bg-alt);
  }

  .faq-question {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    padding: 16px;
    background: none;
    border: none;
    font-size: 1rem;
    font-weight: 500;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }

  .faq-question :global(.faq-chevron) {
    flex-shrink: 0;
    color: var(--muted);
    transition: transform 0.2s ease;
  }

  .faq-item.open .faq-question :global(.faq-chevron) {
    transform: rotate(180deg);
    color: var(--accent);
  }

  .faq-answer {
    padding: 0 16px 16px;
    animation: fadeIn 0.2s ease;
  }

  .faq-answer p {
    color: var(--ink-secondary);
    line-height: 1.7;
    margin: 0;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .faq-cta {
    max-width: 800px;
    margin: 48px auto 0;
    text-align: center;
    padding: 40px;
  }

  .faq-cta h3 {
    font-size: 1.25rem;
    margin-bottom: 8px;
  }

  .faq-cta-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 24px;
  }

  @media (max-width: 640px) {
    .faq-cta-buttons {
      flex-direction: column;
    }

    .faq-category-header {
      padding: 16px;
    }

    .faq-question {
      padding: 14px 12px;
      font-size: 0.95rem;
    }

    .faq-answer {
      padding: 0 12px 14px;
    }
  }
</style>
