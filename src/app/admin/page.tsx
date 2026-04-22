'use client';

import { useRef } from 'react';
import ProspectsPanel, { type ProspectsPanelHandle } from './ProspectsPanel';
import FindProspectsPanel from './FindProspectsPanel';

export default function AdminHome() {
  const prospectsRef = useRef<ProspectsPanelHandle>(null);

  return (
    <>
      <FindProspectsPanel onAdded={() => prospectsRef.current?.refresh()} />
      <ProspectsPanel ref={prospectsRef} />
    </>
  );
}
