export default function ChartView({ chartSvg, chartLoading, chartError, chartLoaded, onCustomize }) {
  return (
    <div className="chart-view-card">
      <div className="chart-view-head">
        <div>
          <p className="t">your chart</p>
          <h2>your chart is ready</h2>
        </div>
        <button type="button" className="continue-inline" onClick={onCustomize}>
          ✨ Customize My Chart
        </button>
      </div>

      {chartError && <div className="gen-alert mono">{chartError}</div>}

      {chartLoading && !chartSvg && (
        <div className="chart-loading">Generating your chart…</div>
      )}

      {!chartLoading && !chartError && !chartSvg && chartLoaded && (
        <div className="chart-loading">Your chart is ready to preview.</div>
      )}

      {chartSvg && <div className="chart-output" dangerouslySetInnerHTML={{ __html: chartSvg }} />}
    </div>
  )
}
