'use client';

import { useRef } from 'react';
import ProspectsPanel, { type ProspectsPanelHandle } from './ProspectsPanel';
import FindProspectsPanel from './FindProspectsPanel';
import M365StatusPanel from './M365StatusPanel';

export default function AdminHome() {
  const prospectsRef = useRef<ProspectsPanelHandle>(null);

  return (
    <>
      <M365StatusPanel />
      <FindProspectsPanel onAdded={() => prospectsRef.current?.refresh()} />
      <ProspectsPanel ref={prospectsRef} />
    </>
  );
}
