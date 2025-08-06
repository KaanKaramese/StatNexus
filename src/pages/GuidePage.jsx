

import React from 'react';
import GuideForm from '../components/GuideForm';
import PublishedGuides from '../components/PublishedGuides';
import styles from './GuidePage.module.css';

export default function GuidePage() {
  // To refresh PublishedGuides after publishing, dispatch a custom event
  const handlePublish = () => {
    window.dispatchEvent(new Event('guide-published'));
  };
  // TODO: Pass user from context or props if needed
  return (
    <main className={styles.mainGuidePage}>
      <h2 className={styles.guideSectionTitle}>Create a Champion Guide</h2>
      <GuideForm user={null} onPublish={handlePublish} />
      <h2 className={styles.publishedSectionTitle}>Published Guides</h2>
      <PublishedGuides />
    </main>
  );
}
