import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/personal/extracurricular/requests/new?step=details');
}
