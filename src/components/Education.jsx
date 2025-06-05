import './Education.css'

const Education = () => {
  const education = {
    title: "Bachelor of Science, Computing Science Zhejiang Dual Degree",
    school: "Simon Fraser University, Burnaby, BC",
    period: "Sep 2023 – Expected Jun 2027",
    description: "3.68 GPA, Dean's Honour Roll"
  }

  return (
    <div className="education-section">
      <h2 className="section-title">Education</h2>
      <div className="education-card">
        <div className="education-header">
          <h3>{education.title}</h3>
          <span className="school">{education.school}</span>
          <span className="period">{education.period}</span>
        </div>
        <p className="description">{education.description}</p>
      </div>
    </div>
  )
}

export default Education 