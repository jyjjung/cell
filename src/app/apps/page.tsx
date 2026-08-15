import { redirect } from 'next/navigation';

/** Legacy full-page chooser — send people through `/` entry routing. */
export default function AppsPage() {
  redirect('/');
}
