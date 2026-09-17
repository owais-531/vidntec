import { whatsappUrl } from '@/lib/whatsapp';
import { WhatsappIcon } from './whatsapp-icon';

export function WhatsappFloatButton() {
  return (
    <a
      href={whatsappUrl('Hello, I need help')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-pop transition-transform hover:scale-105"
    >
      <WhatsappIcon size={24} />
    </a>
  );
}
