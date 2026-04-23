interface ResultCardProps {
  label: string
  value: string
  isError?: boolean
}

function ResultCard({ label, value, isError = false }: ResultCardProps): React.JSX.Element {
  return (
    <div className={`result ${isError ? 'error-box' : ''}`} aria-live={isError ? 'assertive' : 'polite'}>
      <span className="result-label">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default ResultCard
