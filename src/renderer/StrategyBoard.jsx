import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Canvas, Control, PencilBrush, Line, Rect, Ellipse, Polygon, IText, FabricImage, Point } from 'fabric';
import { useMapMinimaps } from './mapImages.js';
import { useAgentIcons, useAgentAbilities } from './agentIcons.js';
import spikeIconUrl from '../assets/spike.png';

const VIEWPORT_SIZE = 1100;
const MIN_ZOOM_FACTOR = 0.6;
const MAX_ZOOM_FACTOR = 6;
const ZOOM_STEP = 1.2;
const DEFAULT_COLOR = '#ff4655';
const STAMP_SIZE = 56;
const FOV_DEGREES = 103; // FOV par défaut de Valorant.
const FOV_RADIUS = 220;
const FOV_SEGMENTS = 20;

function buildSightlinePoints() {
  const half = (FOV_DEGREES / 2) * (Math.PI / 180);
  const points = [{ x: 0, y: 0 }];
  for (let i = 0; i <= FOV_SEGMENTS; i++) {
    const angle = -half + (2 * half * i) / FOV_SEGMENTS;
    points.push({ x: FOV_RADIUS * Math.cos(angle), y: FOV_RADIUS * Math.sin(angle) });
  }
  return points;
}

function genMarkerId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Poignée de rotation libre pour la ligne de vue : positionnée au bord droit
// de sa bounding box (x:0.5, y:0), ce qui correspond exactement à la pointe
// du cône (le rayon central de buildSightlinePoints() passe par ce point).
// L'action pivote autour de l'ancrage réel de l'objet (getPositionByOrigin),
// pas autour de son centre visuel — contrairement à la poignée 'mtr' par
// défaut de Fabric, qui pivote toujours au centre et ferait dériver la
// pointe hors de la position du joueur.
function renderSightlineRotateHandle(ctx, left, top, styleOverride, fabricObject) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(left, top, 7, 0, Math.PI * 2, false);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = fabricObject.stroke || DEFAULT_COLOR;
  ctx.stroke();
  ctx.restore();
}

function sightlineRotateActionHandler(eventData, transform, x, y) {
  const { target } = transform;
  const pivot = target.getPositionByOrigin(target.originX, target.originY);
  let angle = (Math.atan2(y - pivot.y, x - pivot.x) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  target.set('angle', angle % 360);
  return true;
}

function createSightlineRotateControl() {
  return new Control({
    x: 0.5,
    y: 0,
    cursorStyle: 'grab',
    actionName: 'rotate',
    render: renderSightlineRotateHandle,
    actionHandler: sightlineRotateActionHandler,
  });
}

function attachSightlineControls(obj) {
  obj.setControlVisible('mtr', false);
  obj.controls = { ...obj.controls, rotateFree: createSightlineRotateControl() };
}

// labelKey plutôt que label : ces constantes sont au niveau module, hors de
// tout composant, donc sans accès à t().
const SHAPE_TOOLS = [
  { key: 'select', labelKey: 'strategy.tools.select' },
  { key: 'pan', labelKey: 'strategy.tools.pan' },
  { key: 'pencil', labelKey: 'strategy.tools.pencil' },
  { key: 'line', labelKey: 'strategy.tools.line' },
  { key: 'rect', labelKey: 'strategy.tools.rect' },
  { key: 'ellipse', labelKey: 'strategy.tools.ellipse' },
  { key: 'text', labelKey: 'strategy.tools.text' },
];

const LAYER_DEFS = [
  { key: 'drawing', labelKey: 'strategy.layers.drawing' },
  { key: 'icons', labelKey: 'strategy.layers.icons' },
  { key: 'text', labelKey: 'strategy.layers.text' },
];

function removeActiveObjects(canvas) {
  const active = canvas.getActiveObject();
  if (!active || active.isEditing) return;
  canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function StrategyBoard() {
  const { t } = useTranslation();
  const minimaps = useMapMinimaps();
  const agentIcons = useAgentIcons();
  const agentAbilities = useAgentAbilities();

  const mapNames = useMemo(() => [...minimaps.keys()].sort(), [minimaps]);
  const [selectedMap, setSelectedMap] = useState('');

  const [tool, setTool] = useState('select');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [layers, setLayers] = useState({ drawing: true, icons: true, text: true });
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedAbility, setSelectedAbility] = useState('');
  const [strategyName, setStrategyName] = useState('');
  const [strategies, setStrategies] = useState([]);
  const [selectedSightline, setSelectedSightline] = useState(null);
  const [sightlineAttached, setSightlineAttached] = useState(false);
  const [lockPicking, setLockPicking] = useState(false);

  const canvasElRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const layersRef = useRef(layers);
  const drawingShapeRef = useRef(null);
  const drawStartRef = useRef(null);
  const panningRef = useRef(null);
  const fitZoomRef = useRef(1);
  const initialViewportRef = useRef(null);
  const lockPickingRef = useRef(false);
  const pendingLockSightlineRef = useRef(null);

  const abilitiesForAgent = agentAbilities.get(selectedAgent) ?? [];

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    lockPickingRef.current = lockPicking;
  }, [lockPicking]);

  useEffect(() => {
    if (!selectedMap && mapNames.length > 0) {
      setSelectedMap(mapNames[0]);
    }
  }, [mapNames, selectedMap]);

  useEffect(() => {
    setSelectedAbility('');
  }, [selectedAgent]);

  const tagLayer = (obj, layerType) => {
    obj.set('layerType', layerType);
    obj.set('visible', layersRef.current[layerType] !== false);
  };

  // Initialise le canvas Fabric une seule fois.
  useEffect(() => {
    const canvas = new Canvas(canvasElRef.current, { selection: true });
    fabricCanvasRef.current = canvas;
    canvas.setDimensions({ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE });
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 5;
    canvas.freeDrawingBrush.color = colorRef.current;

    canvas.on('path:created', (opt) => {
      tagLayer(opt.path, 'drawing');
    });

    canvas.on('mouse:down', (opt) => {
      if (lockPickingRef.current) {
        const marker = opt.target?.isPositionMarker ? opt.target : null;
        const sightline = pendingLockSightlineRef.current;
        if (marker && sightline) {
          sightline.set({
            attachedTo: marker.markerId,
            lockMovementX: true,
            lockMovementY: true,
            left: marker.left,
            top: marker.top,
          });
          canvas.requestRenderAll();
        }
        pendingLockSightlineRef.current = null;
        lockPickingRef.current = false;
        setLockPicking(false);
        return;
      }

      const currentTool = toolRef.current;

      if (currentTool === 'pan') {
        panningRef.current = { x: opt.e.clientX, y: opt.e.clientY };
        return;
      }

      if (!['line', 'rect', 'ellipse', 'text'].includes(currentTool)) return;
      const pointer = canvas.getScenePoint(opt.e);

      if (currentTool === 'text') {
        const text = new IText(t('strategy.defaultText'), {
          left: pointer.x,
          top: pointer.y,
          fill: colorRef.current,
          fontSize: 30,
        });
        tagLayer(text, 'text');
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        setTool('select');
        return;
      }

      drawStartRef.current = pointer;
      let shape;
      if (currentTool === 'line') {
        shape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: colorRef.current,
          strokeWidth: 4,
          selectable: false,
        });
      } else if (currentTool === 'rect') {
        shape = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: 'transparent',
          stroke: colorRef.current,
          strokeWidth: 4,
          selectable: false,
        });
      } else if (currentTool === 'ellipse') {
        shape = new Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 1,
          ry: 1,
          fill: 'transparent',
          stroke: colorRef.current,
          strokeWidth: 4,
          selectable: false,
        });
      }
      drawingShapeRef.current = shape;
      canvas.add(shape);
    });

    canvas.on('mouse:move', (opt) => {
      if (panningRef.current) {
        const last = panningRef.current;
        const dx = opt.e.clientX - last.x;
        const dy = opt.e.clientY - last.y;
        canvas.relativePan(new Point(dx, dy));
        panningRef.current = { x: opt.e.clientX, y: opt.e.clientY };
        return;
      }

      const shape = drawingShapeRef.current;
      if (!shape) return;
      const pointer = canvas.getScenePoint(opt.e);
      const start = drawStartRef.current;

      if (shape.type === 'line') {
        shape.set({ x2: pointer.x, y2: pointer.y });
      } else if (shape.type === 'rect') {
        shape.set({
          left: Math.min(start.x, pointer.x),
          top: Math.min(start.y, pointer.y),
          width: Math.abs(pointer.x - start.x),
          height: Math.abs(pointer.y - start.y),
        });
      } else if (shape.type === 'ellipse') {
        shape.set({
          left: Math.min(start.x, pointer.x),
          top: Math.min(start.y, pointer.y),
          rx: Math.abs(pointer.x - start.x) / 2,
          ry: Math.abs(pointer.y - start.y) / 2,
        });
      }
      canvas.requestRenderAll();
    });

    canvas.on('mouse:up', () => {
      if (panningRef.current) {
        panningRef.current = null;
        return;
      }
      const shape = drawingShapeRef.current;
      if (!shape) return;
      shape.set({ selectable: true });
      tagLayer(shape, 'drawing');
      drawingShapeRef.current = null;
      drawStartRef.current = null;
      canvas.requestRenderAll();
      setTool('select');
    });

    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      const fit = fitZoomRef.current;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = clamp(zoom, fit * MIN_ZOOM_FACTOR, fit * MAX_ZOOM_FACTOR);
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    canvas.on('object:added', (opt) => {
      if (!opt.target.layerType) {
        tagLayer(opt.target, 'icons');
      }
    });

    // Une ligne de vue attachée à une position joueur suit son marqueur.
    canvas.on('object:moving', (opt) => {
      const moved = opt.target;
      if (!moved.markerId) return;
      canvas.getObjects().forEach((obj) => {
        if (obj.attachedTo === moved.markerId) {
          obj.set({ left: moved.left, top: moved.top });
        }
      });
      canvas.requestRenderAll();
    });

    // Si le marqueur attaché est supprimé, la ligne de vue redevient libre
    // plutôt que de rester verrouillée en place.
    canvas.on('object:removed', (opt) => {
      const removed = opt.target;
      if (!removed.markerId) return;
      canvas.getObjects().forEach((obj) => {
        if (obj.attachedTo === removed.markerId) {
          obj.set({ attachedTo: null, lockMovementX: false, lockMovementY: false });
        }
      });
      updateSelection();
    });

    const updateSelection = () => {
      const active = canvas.getActiveObject();
      const sightline = active && active.isSightline ? active : null;
      setSelectedSightline(sightline);
      setSightlineAttached(!!sightline?.attachedTo);
    };
    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', updateSelection);

    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        removeActiveObjects(canvas);
      }
      if (e.key === 'Escape' && lockPickingRef.current) {
        pendingLockSightlineRef.current = null;
        lockPickingRef.current = false;
        setLockPicking(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Adapte la taille AFFICHÉE du canvas à la taille de son conteneur (donc à
  // la fenêtre de l'app), sans toucher à sa résolution interne (VIEWPORT_SIZE)
  // — les coordonnées des objets (dessins, icônes, stratégies sauvegardées)
  // restent donc valables quelle que soit la taille de la fenêtre.
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver((entries) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const { width } = entries[0].contentRect;
      const size = Math.max(200, Math.floor(width));
      canvas.setDimensions({ width: size, height: size }, { cssOnly: true });
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // Bascule dessin libre / sélection / déplacement de la vue.
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.isDrawingMode = tool === 'pencil';
    canvas.selection = tool === 'select';
    canvas.forEachObject((obj) => obj.set('evented', tool !== 'pan'));
    canvas.defaultCursor = tool === 'pan' ? 'grab' : 'default';
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
    }
  }, [tool, color]);

  // Recharge le fond de map à chaque changement de map.
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const url = minimaps.get(selectedMap);
    if (!canvas || !url) return;

    let cancelled = false;
    canvas.clear();
    canvas.backgroundColor = '#0f1115';

    FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      if (cancelled) return;
      const fit = Math.min(VIEWPORT_SIZE / img.width, VIEWPORT_SIZE / img.height);
      fitZoomRef.current = fit;
      const offsetX = (VIEWPORT_SIZE - img.width * fit) / 2;
      const offsetY = (VIEWPORT_SIZE - img.height * fit) / 2;
      const vpt = [fit, 0, 0, fit, offsetX, offsetY];
      initialViewportRef.current = vpt;
      canvas.setViewportTransform(vpt);
      img.set({ left: 0, top: 0, originX: 'left', originY: 'top', selectable: false, evented: false });
      canvas.backgroundImage = img;
      canvas.requestRenderAll();
    });

    setStrategyName('');
    refreshStrategies(selectedMap);

    return () => {
      cancelled = true;
    };
  }, [selectedMap, minimaps]);

  // Applique la visibilité des calques.
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((obj) => {
      if (obj.layerType && layers[obj.layerType] !== undefined) {
        obj.set('visible', layers[obj.layerType]);
      }
    });
    canvas.requestRenderAll();
  }, [layers]);

  function refreshStrategies(map) {
    window.electronAPI.listStrategies(map).then(setStrategies);
  }

  function zoomBy(factor) {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const fit = fitZoomRef.current;
    const zoom = clamp(canvas.getZoom() * factor, fit * MIN_ZOOM_FACTOR, fit * MAX_ZOOM_FACTOR);
    canvas.zoomToPoint(canvas.getVpCenter(), zoom);
  }

  function resetView() {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !initialViewportRef.current) return;
    canvas.setViewportTransform([...initialViewportRef.current]);
  }

  // Taille fixée une fois, à la pose, en unités de la carte — pas à l'écran :
  // l'icône doit rester à la même taille RELATIVEMENT à la carte, donc suivre
  // le zoom exactement comme la carte elle-même, sans compensation.
  function placeStamp(objectFactory, layerType, scale, origin = { originX: 'center', originY: 'center' }) {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const center = canvas.getVpCenter();
    const obj = objectFactory();
    obj.set({ left: center.x, top: center.y, ...origin, scaleX: scale, scaleY: scale });
    tagLayer(obj, layerType);
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  }

  function handleStampSpike() {
    FabricImage.fromURL(spikeIconUrl).then((img) => {
      placeStamp(() => img, 'icons', STAMP_SIZE / img.width);
    });
  }

  function handleStampAgentPosition() {
    const iconUrl = agentIcons.get(selectedAgent);
    if (!iconUrl) return;
    FabricImage.fromURL(iconUrl, { crossOrigin: 'anonymous' }).then((img) => {
      img.set({ isPositionMarker: true, markerId: genMarkerId() });
      placeStamp(() => img, 'icons', STAMP_SIZE / img.width);
    });
  }

  function handleStampAbility() {
    const ability = abilitiesForAgent.find((a) => a.name === selectedAbility);
    if (!ability) return;
    FabricImage.fromURL(ability.icon, { crossOrigin: 'anonymous' }).then((img) => {
      placeStamp(() => img, 'icons', STAMP_SIZE / img.width);
    });
  }

  function handlePlaceSightline() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    const marker = active && active.isPositionMarker ? active : null;
    const anchor = marker ? { x: marker.left, y: marker.top } : canvas.getVpCenter();
    const cone = new Polygon(buildSightlinePoints(), {
      left: anchor.x,
      top: anchor.y,
      originX: 'left',
      originY: 'center',
      fill: `${color}2E`,
      stroke: color,
      strokeWidth: 2,
      centeredRotation: false,
      isSightline: true,
      attachedTo: marker ? marker.markerId : null,
      lockMovementX: !!marker,
      lockMovementY: !!marker,
    });
    // Rotation libre via une poignée custom ancrée sur la position (pas le
    // centre de la forme comme le ferait la poignée 'mtr' par défaut de
    // Fabric) — voir attachSightlineControls(). Les boutons ↺/↻ restent
    // disponibles pour des ajustements précis en plus du glisser-déposer.
    attachSightlineControls(cone);
    tagLayer(cone, 'icons');
    canvas.add(cone);
    canvas.setActiveObject(cone);
    canvas.requestRenderAll();
  }

  function rotateSightline(delta) {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedSightline) return;
    selectedSightline.set('angle', ((selectedSightline.angle || 0) + delta + 360) % 360);
    canvas.requestRenderAll();
  }

  // Arme le mode "verrouillage" : le prochain clic sur une position joueur
  // sur la carte attache la ligne de vue sélectionnée à ce marqueur (elle se
  // recale dessus et le suit désormais), sans perdre son orientation actuelle.
  function armLockToPlayer() {
    if (!selectedSightline) return;
    pendingLockSightlineRef.current = selectedSightline;
    setLockPicking(true);
  }

  function cancelLockToPlayer() {
    pendingLockSightlineRef.current = null;
    setLockPicking(false);
  }

  function detachSightline() {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedSightline) return;
    selectedSightline.set({ attachedTo: null, lockMovementX: false, lockMovementY: false });
    canvas.requestRenderAll();
    setSightlineAttached(false);
  }

  function handleDeleteSelection() {
    const canvas = fabricCanvasRef.current;
    if (canvas) removeActiveObjects(canvas);
  }

  function handleSave() {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !strategyName.trim() || !selectedMap) return;
    const json = JSON.stringify(
      canvas.toObject([
        'layerType',
        'isSightline',
        'centeredRotation',
        'isPositionMarker',
        'markerId',
        'attachedTo',
        'lockMovementX',
        'lockMovementY',
      ]),
    );
    window.electronAPI.saveStrategy(strategyName.trim(), selectedMap, json).then(() => {
      setStrategyName('');
      refreshStrategies(selectedMap);
    });
  }

  function handleLoadStrategy(entry) {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const data = JSON.parse(entry.canvas_json);
    canvas.loadFromJSON(data).then(() => {
      canvas.getObjects().forEach((obj) => {
        if (obj.isSightline) attachSightlineControls(obj);
      });
      canvas.requestRenderAll();
    });
  }

  function handleDeleteStrategy(id) {
    window.electronAPI.deleteStrategy(id).then(() => refreshStrategies(selectedMap));
  }

  function handleExportPng() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${(strategyName || selectedMap || 'strategie').replace(/\s+/g, '_')}.png`;
    link.click();
  }

  return (
    <div className="strategy-board">
      <div className="strategy-layout">
        <div className="strategy-canvas-wrap card" ref={canvasWrapRef}>
          <canvas ref={canvasElRef} />
        </div>

        <div className="strategy-toolbar card">
        <div className="strategy-toolbar-section">
          <div className="strategy-section-label">{t('strategy.mapSection')}</div>
          <div className="strategy-toolbar-row">
            <select className="strategy-map-select" value={selectedMap} onChange={(e) => setSelectedMap(e.target.value)}>
              {mapNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <div className="strategy-tool-group">
              <button className="strategy-tool icon-only" onClick={() => zoomBy(1 / ZOOM_STEP)} title={t('strategy.zoomOut')}>
                🔍－
              </button>
              <button className="strategy-tool icon-only" onClick={() => zoomBy(ZOOM_STEP)} title={t('strategy.zoomIn')}>
                🔍＋
              </button>
            </div>
            <button className="strategy-tool" onClick={resetView}>
              {t('strategy.resetView')}
            </button>
          </div>
        </div>

        <div className="strategy-toolbar-section">
          <div className="strategy-section-label">{t('strategy.drawSection')}</div>
          <div className="strategy-toolbar-row">
            <div className="strategy-tool-group">
              {SHAPE_TOOLS.map((st) => (
                <button
                  key={st.key}
                  className={st.key === tool ? 'strategy-tool active' : 'strategy-tool'}
                  onClick={() => setTool(st.key)}
                >
                  {t(st.labelKey)}
                </button>
              ))}
            </div>

            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title={t('strategy.color')}
            />

            <button className="strategy-tool danger" onClick={handleDeleteSelection}>
              {t('strategy.delete')}
            </button>
          </div>
        </div>

        <div className="strategy-toolbar-section">
          <div className="strategy-section-label">{t('strategy.agentsSection')}</div>
          <div className="strategy-toolbar-row">
            <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
              <option value="">{t('strategy.chooseAgent')}</option>
              {[...agentIcons.keys()].sort().map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button className="strategy-tool" onClick={handleStampAgentPosition} disabled={!selectedAgent}>
              {t('strategy.placePosition')}
            </button>

            <select
              value={selectedAbility}
              onChange={(e) => setSelectedAbility(e.target.value)}
              disabled={!selectedAgent}
            >
              <option value="">{t('strategy.chooseAbility')}</option>
              {abilitiesForAgent.map((ability) => (
                <option key={ability.name} value={ability.name}>
                  {ability.name}
                </option>
              ))}
            </select>
            <button className="strategy-tool" onClick={handleStampAbility} disabled={!selectedAbility}>
              {t('strategy.placeAbility')}
            </button>
          </div>
        </div>

        <div className="strategy-toolbar-section">
          <div className="strategy-section-label">{t('strategy.iconsSection')}</div>
          <div className="strategy-toolbar-row">
            <button className="strategy-tool" onClick={handleStampSpike}>
              {t('strategy.spike')}
            </button>
            <button
              className="strategy-tool"
              title={t('strategy.sightlineTitle')}
              onClick={handlePlaceSightline}
            >
              {t('strategy.sightline')}
            </button>
            {selectedSightline && (
              <div className="strategy-sightline-controls">
                <span className="strategy-inline-label">{t('strategy.orient')}</span>
                <button className="strategy-tool icon-only" onClick={() => rotateSightline(-15)} title={t('strategy.rotateMinus')}>
                  ↺
                </button>
                <button className="strategy-tool icon-only" onClick={() => rotateSightline(15)} title={t('strategy.rotatePlus')}>
                  ↻
                </button>
                {sightlineAttached ? (
                  <button className="strategy-tool" onClick={detachSightline}>
                    {t('strategy.detachFromPlayer')}
                  </button>
                ) : lockPicking ? (
                  <button className="strategy-tool active" onClick={cancelLockToPlayer}>
                    {t('strategy.clickOnPlayer')}
                  </button>
                ) : (
                  <button className="strategy-tool" onClick={armLockToPlayer}>
                    {t('strategy.linkToPlayer')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="strategy-toolbar-section strategy-save-section">
          <h3>{t('strategy.save')}</h3>
          <div className="strategy-save-row">
            <input
              type="text"
              placeholder={t('strategy.namePlaceholder')}
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
            />
            <button onClick={handleSave} disabled={!strategyName.trim()}>
              {t('strategy.saveBtn')}
            </button>
          </div>
          <button className="strategy-export" onClick={handleExportPng}>
            {t('strategy.exportPng')}
          </button>

          <h3>{t('strategy.savedStrategies', { map: selectedMap })}</h3>
          {strategies.length === 0 ? (
            <p className="label">{t('strategy.noSavedStrategies')}</p>
          ) : (
            <ul className="strategy-list">
              {strategies.map((entry) => (
                <li key={entry.id}>
                  <button className="strategy-list-name" onClick={() => handleLoadStrategy(entry)}>
                    {entry.name}
                  </button>
                  <button className="strategy-list-delete" onClick={() => handleDeleteStrategy(entry.id)} title={t('strategy.deleteTitle')}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="strategy-toolbar-section">
          <div className="strategy-section-label">{t('strategy.layersSection')}</div>
          <div className="strategy-toolbar-row">
            {LAYER_DEFS.map((l) => (
              <label key={l.key} className="strategy-layer-toggle">
                <input
                  type="checkbox"
                  checked={layers[l.key]}
                  onChange={(e) => setLayers((prev) => ({ ...prev, [l.key]: e.target.checked }))}
                />
                {t(l.labelKey)}
              </label>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export default StrategyBoard;
