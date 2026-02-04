import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { registerSchema } from '$lib/validators/auth';

export const load = async () => {
  const form = await superValidate(zod(registerSchema as any));
  return { form };
};
