import React from 'react';
import { education, experiences } from '../data/portfolio';

/** The hero's at-a-glance summary, built from the portfolio data. */
const DiveCard: React.FC = () => {
  const [current] = experiences;
  const school = education.university.split(',')[0];
  return (
    <dl className="dive-card">
      {current && (
        <div>
          <dt>Now</dt>
          <dd>{current.role} · {current.company.split(',')[0]}</dd>
        </div>
      )}
      <div>
        <dt>Study</dt>
        <dd>{education.degree.replace('Bachelor of Science, ', 'BSc ')} · {school}</dd>
      </div>
    </dl>
  );
};

export default React.memo(DiveCard);
