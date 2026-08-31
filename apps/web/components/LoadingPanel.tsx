export function LoadingPanel({ label = 'Loading...' }: { label?: string }) {
  return <div className="panel center" style={{padding:36}}>
    <div className="loading-spinner" />
    <p className="muted" style={{fontSize:8}}>{label}</p>
  </div>;
}

export function ErrorPanel({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="panel center" style={{padding:28,borderColor:'rgba(255,90,126,.4)'}}>
    <strong style={{fontSize:10}}>Something went wrong</strong>
    <p className="muted" style={{fontSize:8}}>{message}</p>
    {retry && <button className="primary-button" onClick={retry}>Try again</button>}
  </div>;
}
