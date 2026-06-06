# NFR evidence and operational gaps

Дата ревизии: 2026-05-18

Этот файл фиксирует проверяемые артефакты по NFR из последнего DOCX-отчета. Цифры из отчета считаются target requirements, если рядом нет исполняемого подтверждения в репозитории.

## Проверено в текущем проходе

| Область | Evidence | Статус |
|---|---|---|
| API compile | `pnpm --filter @mentory/api build` | Пройдено |
| Web compile | `pnpm --filter @mentory/web build` | Пройдено |
| Svelte diagnostics | `pnpm --filter @mentory/web check` | 0 errors, 0 warnings |
| Booking state machine unit test | `pnpm --filter @mentory/api exec jest src/modules/booking/booking.service.spec.ts --runInBand --preset ts-jest --testEnvironment node` | 10 tests passed |

## Покрытые NFR/ограничения

- NFR8/NFR10/NFR11: PDF/PNG/JPG/file uploads до 128 MB валидируются в trust/chat/regalia flows.
- Файлы из `data:*;base64,...` больше не сохраняются как base64 metadata: `FileStorageService` пишет файл в `UPLOADS_DIR` или `./uploads` и сохраняет публичный `/uploads/*` URL.
- `main.ts` отдает `/uploads/*` через Express static middleware.
- Booking защищен Redis lock + transactional slot check.

## Непокрытые target-only NFR

- NFR3/NFR15: нет load/stress evidence для 1k/10k/50k запросов или 50k concurrent users.
- NFR5: нет DWH/export pipeline для `bdm.histrical_data`.
- NFR6: нет retention job/policy на 6 месяцев.
- NFR14: нет backup/restore drill и формального RTO/RPO evidence.
- NFR16: in-app + SMTP email есть; push delivery и production-grade email queue не реализованы.
- NFR18: 24h support SLA не закреплен процессом или автоматикой.
