import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { loginSchema } from '$lib/validators/auth';

export const load = async () => {
  const form = await superValidate(zod(loginSchema as any));
  return { form };
};
