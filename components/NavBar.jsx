import Link from 'next/link';

const links = [
  { href: '/', label: '🎨 涂鸦', },
  { href: '/templates', label: '✏️ 临摹' },
  { href: '/gallery', label: '🖼️ 画廊' },
  { href: '/community', label: '🌈 社区' },
];

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 h-16 px-4 sm:px-8 flex items-center justify-between card-soft">
      <Link href="/" className="flex items-center gap-2 font-extrabold text-xl">
        <span className="text-2xl animate-float">🖐️</span>
        <span className="text-gradient hidden sm:inline">Air Doodle 手势涂鸦工坊</span>
        <span className="text-gradient sm:hidden">Air Doodle</span>
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-2 rounded-full font-semibold text-sm sm:text-base text-[#6d6d9c] hover:bg-white hover:text-candy-purple transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
