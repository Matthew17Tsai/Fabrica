'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Path, Circle, Line, Text, Group, Rect } from 'react-konva';
import Konva from 'konva';

interface FlatSketchEditorProps {
  projectId: string;
  svgContent: string;
  onSave: (updatedSVG: string) => Promise<void>;
}

interface PathData {
  id: string;
  d: string;
}

interface CalloutData {
  id: string;
  x: number;
  y: number;
  label: string;
  lineEndX: number;
  lineEndY: number;
}

interface SvgMeta {
  viewWidth: number;
  viewHeight: number;
  rawWidth: string;
  rawHeight: string;
  viewBox: string;
}

const CANVAS_W = 820;
const CANVAS_H = 640;
const PADDING = 40;

export default function FlatSketchEditor({ projectId, svgContent, onSave }: FlatSketchEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [paths, setPaths] = useState<PathData[]>([]);
  const [callouts, setCallouts] = useState<CalloutData[]>([]);
  const [svgMeta, setSvgMeta] = useState<SvgMeta>({ viewWidth: 800, viewHeight: 600, rawWidth: '800', rawHeight: '600', viewBox: '0 0 800 600' });
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [mode, setMode] = useState<'select' | 'callout'>('select');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [pendingLabel, setPendingLabel] = useState<{ x: number; y: number } | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [selectedCalloutId, setSelectedCalloutId] = useState<string | null>(null);

  // Parse SVG content and extract paths + callouts
  useEffect(() => {
    if (!svgContent) return;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) return;

      // Parse dimensions
      const vb = svgEl.getAttribute('viewBox') || '0 0 800 600';
      const parts = vb.split(/\s+/).map(Number);
      const vw = parts[2] || 800;
      const vh = parts[3] || 600;

      setSvgMeta({
        viewWidth: vw,
        viewHeight: vh,
        rawWidth: svgEl.getAttribute('width') || String(vw),
        rawHeight: svgEl.getAttribute('height') || String(vh),
        viewBox: vb,
      });

      // Compute fit-to-canvas scale
      const availW = CANVAS_W - PADDING * 2;
      const availH = CANVAS_H - PADDING * 2;
      const scaleX = availW / vw;
      const scaleY = availH / vh;
      const fitScale = Math.min(scaleX, scaleY, 1);
      setScale(fitScale);
      setOffsetX((CANVAS_W - vw * fitScale) / 2);
      setOffsetY((CANVAS_H - vh * fitScale) / 2);

      // Extract paths from Details group
      const details = doc.querySelector('#Details');
      const allPaths = details
        ? Array.from(details.querySelectorAll('path'))
        : Array.from(doc.querySelectorAll('path'));

      setPaths(allPaths.map((p, i) => ({
        id: `path-${i}`,
        d: p.getAttribute('d') || '',
      })).filter(p => p.d));

      // Extract existing callouts
      const calloutsGroup = doc.querySelector('#Callouts');
      if (calloutsGroup) {
        const groups = Array.from(calloutsGroup.querySelectorAll('g[data-callout]'));
        const parsed: CalloutData[] = groups.map(g => {
          const circ = g.querySelector('circle');
          const ln = g.querySelector('line');
          const txt = g.querySelector('text');
          return {
            id: g.getAttribute('data-callout') || `c-${Date.now()}`,
            x: parseFloat(circ?.getAttribute('cx') || '0'),
            y: parseFloat(circ?.getAttribute('cy') || '0'),
            lineEndX: parseFloat(ln?.getAttribute('x2') || '0'),
            lineEndY: parseFloat(ln?.getAttribute('y2') || '0'),
            label: txt?.textContent || '',
          };
        }).filter(c => c.label);
        setCallouts(parsed);
      }
    } catch (err) {
      console.error('SVG parse error:', err);
    }
  }, [svgContent]);

  // Convert canvas coords back to SVG viewBox coords
  const canvasToSvg = useCallback((cx: number, cy: number) => ({
    x: (cx - offsetX) / scale,
    y: (cy - offsetY) / scale,
  }), [offsetX, offsetY, scale]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (mode !== 'callout') return;
    // Don't fire on existing elements
    if (e.target !== e.target.getStage()) {
      const targetClass = e.target.getClassName();
      if (targetClass !== 'Rect') return; // background click only
    }
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return;
    setPendingLabel({ x: pos.x, y: pos.y });
    setLabelInput('');
  }, [mode]);

  const confirmCallout = useCallback(() => {
    if (!pendingLabel || !labelInput.trim()) return;
    const svgCoords = canvasToSvg(pendingLabel.x, pendingLabel.y);
    const newCallout: CalloutData = {
      id: `callout-${Date.now()}`,
      x: svgCoords.x,
      y: svgCoords.y,
      lineEndX: svgCoords.x + 60,
      lineEndY: svgCoords.y - 40,
      label: labelInput.trim(),
    };
    setCallouts(prev => [...prev, newCallout]);
    setPendingLabel(null);
    setLabelInput('');
    setMode('select');
  }, [pendingLabel, labelInput, canvasToSvg]);

  const cancelCallout = useCallback(() => {
    setPendingLabel(null);
    setLabelInput('');
    setMode('select');
  }, []);

  const removeCallout = useCallback((id: string) => {
    setCallouts(prev => prev.filter(c => c.id !== id));
    setSelectedCalloutId(null);
  }, []);

  // Reconstruct SVG from current state
  const buildSVG = useCallback((): string => {
    const pathsXML = paths.map(p => `    <path d="${p.d}"/>`).join('\n');
    const calloutsXML = callouts.map(c => `    <g data-callout="${c.id}">
      <circle cx="${c.x.toFixed(2)}" cy="${c.y.toFixed(2)}" r="4" class="callout-dot"/>
      <line x1="${c.x.toFixed(2)}" y1="${c.y.toFixed(2)}" x2="${c.lineEndX.toFixed(2)}" y2="${c.lineEndY.toFixed(2)}" class="callout-line"/>
      <text x="${(c.lineEndX + 6).toFixed(2)}" y="${(c.lineEndY + 4).toFixed(2)}" class="callout-text">${c.label}</text>
    </g>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgMeta.rawWidth}" height="${svgMeta.rawHeight}" viewBox="${svgMeta.viewBox}">
  <defs>
    <style>
      .detail { stroke: #000; fill: none; stroke-width: 2; }
      .callout-dot { fill: #000; }
      .callout-line { stroke: #000; stroke-width: 1; fill: none; }
      .callout-text { font-family: Arial, sans-serif; font-size: 12px; fill: #000; }
    </style>
  </defs>
  <g id="Outline"></g>
  <g id="Details" class="detail">
${pathsXML}
  </g>
  <g id="Callouts">
${calloutsXML}
  </g>
</svg>`;
  }, [paths, callouts, svgMeta]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      await onSave(buildSVG());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [buildSVG, onSave]);

  // Canvas coords for rendering
  const toCanvas = (x: number, y: number) => ({
    cx: offsetX + x * scale,
    cy: offsetY + y * scale,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
        <button
          onClick={() => { setMode('select'); setPendingLabel(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === 'select' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Select / Move
        </button>
        <button
          onClick={() => { setMode('callout'); setPendingLabel(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === 'callout' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          {mode === 'callout' ? 'Click canvas to place...' : 'Add callout'}
        </button>

        <div className="flex-1" />

        {saveStatus === 'saved' && (
          <span className="text-green-600 text-sm font-medium">Saved!</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-red-600 text-sm font-medium">Save failed</span>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Label input popup */}
      {pendingLabel && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
          <span className="text-sm font-medium text-amber-800">Callout label:</span>
          <input
            autoFocus
            type="text"
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmCallout(); if (e.key === 'Escape') cancelCallout(); }}
            className="flex-1 px-3 py-1.5 border border-amber-300 rounded text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            placeholder="e.g. Kangaroo pocket"
          />
          <button onClick={confirmCallout} disabled={!labelInput.trim()} className="px-3 py-1.5 bg-amber-500 text-white rounded text-sm font-medium disabled:opacity-40 hover:bg-amber-600">
            Add
          </button>
          <button onClick={cancelCallout} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300">
            Cancel
          </button>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`border border-gray-300 rounded-lg overflow-hidden bg-gray-50 ${mode === 'callout' ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ width: CANVAS_W, height: CANVAS_H }}
      >
        <Stage
          ref={stageRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handleStageClick}
        >
          <Layer>
            {/* Background */}
            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#f9fafb" />
            <Rect
              x={offsetX}
              y={offsetY}
              width={svgMeta.viewWidth * scale}
              height={svgMeta.viewHeight * scale}
              fill="white"
              stroke="#e5e7eb"
              strokeWidth={1}
            />

            {/* Sketch paths group — draggable as a whole */}
            <Group draggable>
              {paths.map(p => (
                <Path
                  key={p.id}
                  data={p.d}
                  x={offsetX}
                  y={offsetY}
                  scaleX={scale}
                  scaleY={scale}
                  stroke="#000"
                  strokeWidth={2 / scale}
                  fill="none"
                  listening={false}
                />
              ))}
            </Group>

            {/* Callouts */}
            {callouts.map(c => {
              const dot = toCanvas(c.x, c.y);
              const end = toCanvas(c.lineEndX, c.lineEndY);
              const isSelected = selectedCalloutId === c.id;
              return (
                <Group
                  key={c.id}
                  draggable
                  onClick={() => setSelectedCalloutId(isSelected ? null : c.id)}
                  onDragEnd={(e) => {
                    const dx = e.target.x();
                    const dy = e.target.y();
                    const svgDx = dx / scale;
                    const svgDy = dy / scale;
                    setCallouts(prev => prev.map(cc =>
                      cc.id === c.id
                        ? { ...cc, x: c.x + svgDx, y: c.y + svgDy, lineEndX: c.lineEndX + svgDx, lineEndY: c.lineEndY + svgDy }
                        : cc
                    ));
                    e.target.position({ x: 0, y: 0 });
                  }}
                >
                  <Line
                    points={[dot.cx, dot.cy, end.cx, end.cy]}
                    stroke={isSelected ? '#2563eb' : '#000'}
                    strokeWidth={1}
                  />
                  <Circle
                    x={dot.cx} y={dot.cy}
                    radius={isSelected ? 6 : 4}
                    fill={isSelected ? '#2563eb' : '#000'}
                  />
                  <Text
                    x={end.cx + 5} y={end.cy - 7}
                    text={c.label}
                    fontSize={11}
                    fill={isSelected ? '#2563eb' : '#000'}
                    fontFamily="Arial, sans-serif"
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>

      {/* Callout list */}
      {callouts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">
            Callouts ({callouts.length}) — click a callout on canvas to select, drag to reposition
          </h3>
          <ul className="space-y-2">
            {callouts.map((c, i) => (
              <li
                key={c.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition ${selectedCalloutId === c.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                onClick={() => setSelectedCalloutId(c.id === selectedCalloutId ? null : c.id)}
              >
                <span>
                  <span className="font-mono text-gray-400 mr-2">{i + 1}.</span>
                  <span className="font-medium">{c.label}</span>
                </span>
                <button
                  onClick={e => { e.stopPropagation(); removeCallout(c.id); }}
                  className="text-red-500 hover:text-red-700 ml-4 text-xs font-medium"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Help */}
      <div className="text-xs text-gray-500 flex gap-6">
        <span>Drag the sketch group to reposition</span>
        <span>Drag callouts to move them</span>
        <span>Click a callout to select / deselect</span>
      </div>
    </div>
  );
}
