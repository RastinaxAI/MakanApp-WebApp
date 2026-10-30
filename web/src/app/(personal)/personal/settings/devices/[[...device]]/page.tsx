import { SecurityDevices } from '@/features/personal/security-devices';
import { notFound } from 'next/navigation';
export default async function Page({ params }: { params: Promise<{ device?: string[] }> }) {
  const { device = [] } = await params;
  if (
    device.length > 1 ||
    (device[0] &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(device[0]))
  )
    notFound();
  return <SecurityDevices id={device[0]} />;
}
