export default function ChartView({
  chartSvg,
  chartLoading,
  chartError,
  chartLoaded,
  onCustomise,
  onReturnToInput,
  onCloseCustomise,
  onExport,
  isCustomiseOpen = false,
  panelRef,
  chartRef,
  outputClassName = 'chart-output',
  outputStyle = {},
  pulseGroup = '',
  pulseNonce = 0,
  showPlacements = true,
  showAspects = true,
  showShimmer = false,
}) {
  const handleCustomiseClick = () => {
    if (isCustomiseOpen) {
      onCloseCustomise?.()
      return
    }

    onCustomise?.()
  }

  return (
    <div className="chart-view-card edit-panel" ref={panelRef}>
      <div className="chart-view-head">
        <div>
          <p className="t">chart ready</p>
          <p className="chart-view-note">Save this result, refine the styling, or return to the birth details.</p>
        </div>
        <div className="chart-view-actions">
          <button
            type="button"
            className="btn-ghost chart-action-secondary"
            onClick={onReturnToInput}
            disabled={chartLoading}
          >
            edit birth details
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleCustomiseClick}
            aria-expanded={isCustomiseOpen}
            aria-controls="chart-customise-panel"
          >
            {isCustomiseOpen ? 'close customisation' : 'customise chart'}
          </button>
          <button
            type="button"
            className="btn-ghost chart-action-secondary"
            onClick={onExport}
            disabled={chartLoading || !chartSvg}
          >
            download your chart (png)
          </button>
        </div>
      </div>

      {chartError && <div className="gen-alert mono">{chartError}</div>}

      {chartLoading && !chartSvg && (
        <div className="chart-loading">Generating chart…</div>
      )}

      {!chartLoading && !chartError && !chartSvg && chartLoaded && (
        <div className="chart-loading">Preview ready.</div>
      )}

      {chartSvg && (
        <div className="chart-output-wrap">
          {showShimmer && <div className="chart-output-shimmer" aria-hidden="true" />}
          <div
            className={`${outputClassName} ${pulseGroup ? `pulse-${pulseGroup}` : ''}`}
            key={`chart-preview-${pulseNonce}`}
            ref={chartRef}
            style={outputStyle}
            data-show-placements={showPlacements}
            data-show-aspects={showAspects}
            dangerouslySetInnerHTML={{ __html: chartSvg }}
          />
        </div>
      )}
    </div>
  )
}
