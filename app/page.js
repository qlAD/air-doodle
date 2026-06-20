import { Suspense } from 'react';
import HomeClient from './HomeClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-[#6d6d9c]">加载画板中…</div>}>
      <HomeClient />
    </Suspense>
  );
}
