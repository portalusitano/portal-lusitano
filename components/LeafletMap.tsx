"use client";

import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./leaflet-tooltip.css";

interface Coudelaria {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  localizacao: string;
  regiao: string;
  foto_capa?: string;
  is_pro: boolean;
  destaque: boolean;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
}

// Coordenadas GPS verificadas de cidades/vilas portuguesas
// Fonte: OpenStreetMap / coordenadas.net
const localCoords: Record<string, [number, number]> = {
  // --- Ribatejo ---
  golega: [39.4013, -8.4874],
  golegã: [39.4013, -8.4874],
  santarem: [39.2363, -8.687],
  santarém: [39.2363, -8.687],
  cartaxo: [39.1592, -8.7856],
  "porto de muge, cartaxo": [39.1592, -8.7856],
  "porto de muge": [39.11, -8.72],
  azambuja: [39.0694, -8.8663],
  almeirim: [39.2125, -8.625],
  "benfica do ribatejo": [39.225, -8.6483],
  "benfica do ribatejo, almeirim": [39.225, -8.6483],
  chamusca: [39.3478, -8.4802],
  alpiarça: [39.2584, -8.5857],
  alpiarca: [39.2584, -8.5857],
  azinhaga: [39.3636, -8.5395],
  muge: [39.1045, -8.713],
  "samora correia": [38.9425, -8.8631],
  coruche: [38.9597, -8.5291],
  benavente: [38.9813, -8.8077],
  "salvaterra de magos": [39.0254, -8.7944],
  "rio maior": [39.3369, -8.9397],
  abrantes: [39.4599, -8.1965],
  tomar: [39.6015, -8.4087],
  "torres novas": [39.4777, -8.5412],
  entroncamento: [39.4656, -8.4678],
  constancia: [39.475, -8.3381],
  constância: [39.475, -8.3381],
  // --- Alentejo ---
  evora: [38.571, -7.9092],
  évora: [38.571, -7.9092],
  "alter do chao": [39.1997, -7.6588],
  "alter do chão": [39.1997, -7.6588],
  "montemor-o-novo": [38.6475, -8.216],
  "montemor o novo": [38.6475, -8.216],
  monforte: [39.053, -7.4391],
  arraiolos: [38.7158, -7.9861],
  "ponte de sor": [39.2481, -8.0102],
  beja: [38.0154, -7.8651],
  elvas: [38.881, -7.163],
  estremoz: [38.8424, -7.5862],
  "vendas novas": [38.6772, -8.4556],
  "alcacer do sal": [38.3734, -8.5131],
  "alcácer do sal": [38.3734, -8.5131],
  "santiago do cacem": [38.0025, -8.6939],
  "santiago do cacém": [38.0025, -8.6939],
  portalegre: [39.2967, -7.4302],
  "campo maior": [39.0168, -7.0668],
  moura: [38.1399, -7.4489],
  serpa: [37.9437, -7.5975],
  mertola: [37.6409, -7.6612],
  mértola: [37.6409, -7.6612],
  "reguengos de monsaraz": [38.4261, -7.5372],
  vidigueira: [38.2094, -7.7997],
  odemira: [37.5973, -8.6393],
  aljustrel: [37.8774, -8.164],
  "castro verde": [37.6967, -8.0833],
  "ferreira do alentejo": [38.057, -8.1148],
  borba: [38.805, -7.4572],
  "vila viçosa": [38.7781, -7.4199],
  "vila vicosa": [38.7781, -7.4199],
  avis: [39.0576, -7.8844],
  crato: [39.2833, -7.6389],
  "vila verde de ficalho": [37.9468, -7.301],
  albernoa: [37.8167, -7.9833],
  comporta: [38.38, -8.785],
  // --- Lisboa ---
  lisboa: [38.7223, -9.1393],
  cascais: [38.6979, -9.4215],
  sintra: [38.798, -9.3879],
  oeiras: [38.6913, -9.3109],
  mafra: [38.9368, -9.3326],
  loures: [38.8308, -9.1685],
  "vila franca de xira": [38.9554, -8.9896],
  alverca: [38.895, -9.038],
  alenquer: [39.0546, -9.0124],
  "torres vedras": [39.0915, -9.2585],
  "sobral de monte agraco": [38.9854, -9.15],
  "sobral de monte agraço": [38.9854, -9.15],
  "arruda dos vinhos": [38.9836, -9.0771],
  setubal: [38.5244, -8.8882],
  setúbal: [38.5244, -8.8882],
  sesimbra: [38.4441, -9.1017],
  palmela: [38.5676, -8.9022],
  alcochete: [38.7567, -8.9627],
  montijo: [38.7071, -8.9726],
  moita: [38.6584, -8.9858],
  barreiro: [38.6634, -9.0724],
  almada: [38.6797, -9.1565],
  seixal: [38.6407, -9.0929],
  // --- Porto ---
  porto: [41.1579, -8.6291],
  "vila nova de gaia": [41.1239, -8.6118],
  matosinhos: [41.1844, -8.6899],
  maia: [41.2356, -8.6199],
  gondomar: [41.1449, -8.534],
  valongo: [41.1906, -8.5014],
  paredes: [41.2059, -8.3307],
  penafiel: [41.2083, -8.2831],
  amarante: [41.2697, -8.0829],
  felgueiras: [41.3667, -8.1942],
  "santo tirso": [41.3437, -8.4741],
  trofa: [41.3392, -8.5601],
  "povoa de varzim": [41.3826, -8.7614],
  "póvoa de varzim": [41.3826, -8.7614],
  "vila do conde": [41.3517, -8.7424],
  // --- Minho ---
  braga: [41.5518, -8.4229],
  guimaraes: [41.4425, -8.2918],
  guimarães: [41.4425, -8.2918],
  "viana do castelo": [41.6936, -8.8327],
  barcelos: [41.5322, -8.618],
  "ponte de lima": [41.7681, -8.5845],
  "arcos de valdevez": [41.8472, -8.4191],
  monção: [42.0768, -8.4819],
  moncao: [42.0768, -8.4819],
  valenca: [42.0277, -8.6427],
  valença: [42.0277, -8.6427],
  caminha: [41.8735, -8.8397],
  "vila verde": [41.6486, -8.4369],
  famalicao: [41.4082, -8.5191],
  famalicão: [41.4082, -8.5191],
  "vila nova de famalicao": [41.4082, -8.5191],
  "vila nova de famalicão": [41.4082, -8.5191],
  // --- Douro / Trás-os-Montes ---
  braganca: [41.8061, -6.7567],
  bragança: [41.8061, -6.7567],
  "vila real": [41.2963, -7.7462],
  chaves: [41.7392, -7.4706],
  mirandela: [41.485, -7.1809],
  lamego: [41.0979, -7.8087],
  "peso da regua": [41.1636, -7.7908],
  "peso da régua": [41.1636, -7.7908],
  "torre de moncorvo": [41.1757, -7.0499],
  mogadouro: [41.3389, -6.7147],
  "macedo de cavaleiros": [41.5365, -6.9591],
  "miranda do douro": [41.4933, -6.2744],
  // --- Centro ---
  coimbra: [40.2033, -8.4103],
  leiria: [39.7437, -8.8071],
  aveiro: [40.6405, -8.6538],
  viseu: [40.6566, -7.9125],
  "castelo branco": [39.8225, -7.4911],
  guarda: [40.5371, -7.2676],
  "figueira da foz": [40.1486, -8.8601],
  "caldas da rainha": [39.4046, -9.1384],
  "marinha grande": [39.7474, -8.9312],
  pombal: [39.9146, -8.6291],
  covilha: [40.2824, -7.5035],
  covilhã: [40.2824, -7.5035],
  fundao: [40.1384, -7.5014],
  fundão: [40.1384, -7.5014],
  seia: [40.4171, -7.7002],
  "oliveira do hospital": [40.3582, -7.8614],
  nelas: [40.5297, -7.8515],
  mangualde: [40.6044, -7.7616],
  agueda: [40.5743, -8.4477],
  águeda: [40.5743, -8.4477],
  ilhavo: [40.6004, -8.6682],
  ílhavo: [40.6004, -8.6682],
  ovar: [40.8576, -8.6261],
  espinho: [41.0077, -8.6406],
  peniche: [39.356, -9.381],
  obidos: [39.3624, -9.1576],
  óbidos: [39.3624, -9.1576],
  batalha: [39.6591, -8.8242],
  alcobaca: [39.5489, -8.9768],
  alcobaça: [39.5489, -8.9768],
  // --- Algarve ---
  faro: [37.0194, -7.9322],
  lagos: [37.1028, -8.6732],
  portimao: [37.1386, -8.5375],
  portimão: [37.1386, -8.5375],
  tavira: [37.1275, -7.6507],
  loule: [37.1381, -8.0186],
  loulé: [37.1381, -8.0186],
  silves: [37.1891, -8.4389],
  albufeira: [37.0891, -8.2505],
  olhao: [37.0268, -7.842],
  olhão: [37.0268, -7.842],
  "vila real de santo antonio": [37.1942, -7.4153],
  "vila real de santo antónio": [37.1942, -7.4153],
  aljezur: [37.3195, -8.8017],
  monchique: [37.319, -8.5568],
  lagoa: [37.1354, -8.4511],
  "sao bras de alportel": [37.1499, -7.8888],
  "são brás de alportel": [37.1499, -7.8888],
  "castro marim": [37.2165, -7.4427],
};

// Fallback por região (se a localização não for encontrada no mapa acima)
const regiaoCoords: Record<string, [number, number]> = {
  Minho: [41.7, -8.3],
  Douro: [41.2, -7.8],
  Porto: [41.15, -8.6],
  Centro: [40.2, -8.2],
  Ribatejo: [39.3, -8.5],
  Lisboa: [38.75, -9.15],
  Alentejo: [38.0, -7.9],
  Algarve: [37.1, -8.0],
};

/**
 * Resolve coordenadas GPS a partir da localização textual.
 * 1. Tenta match exacto no mapa de cidades
 * 2. Tenta match parcial (ex: "Alter do Chão, Alentejo" → "alter do chao")
 * 3. Fallback para centro da região
 */
function resolveCoords(
  localizacao: string,
  regiao: string,
  coordLat?: number,
  coordLng?: number
): [number, number] | null {
  // Se tem coordenadas explícitas, usa-as
  if (coordLat && coordLng) return [coordLat, coordLng];

  const loc = localizacao
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .trim();

  // Match exacto
  if (localCoords[loc]) return localCoords[loc];

  // Match parcial — tenta cada parte separada por vírgula
  const parts = loc.split(",").map((p) => p.trim());
  for (const part of parts) {
    if (localCoords[part]) return localCoords[part];
  }

  // Tenta match parcial — procura se alguma key do mapa está contida na localização
  for (const [key, coords] of Object.entries(localCoords)) {
    const keyNorm = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (loc.includes(keyNorm) || keyNorm.includes(loc)) {
      return coords;
    }
  }

  // Fallback para centro da região
  return regiaoCoords[regiao] || null;
}

// Marker dourado custom
const goldIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width:32px;height:32px;
    background:#C5A059;
    border:3px solid #fff;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center; "><div style="transform:rotate(45deg);color:#000;font-weight:bold;font-size:12px;">&#9733;</div></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const defaultIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width:24px;height:24px;
    background:#C5A059;
    border:2px solid rgba(255,255,255,0.6);
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 2px 6px rgba(0,0,0,0.4); "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

// Componente auxiliar para controlar fly-to
function FlyToMarker({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  if (center) {
    map.flyTo(center, zoom || 10, { duration: 0.8 });
  }
  return null;
}

export default function LeafletMap({
  coudelarias,
  flyTo,
  onMarkerClick,
}: {
  coudelarias: Coudelaria[];
  flyTo?: [number, number] | null;
  onMarkerClick?: (c: Coudelaria) => void;
}) {
  return (
    <MapContainer
      center={[39.5, -8.0]}
      zoom={7}
      minZoom={6}
      maxZoom={16}
      className="w-full h-full rounded-2xl"
      style={{ background: "#0a0a0a" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {flyTo && <FlyToMarker center={flyTo} />}

      {coudelarias.map((c) => {
        const coords = resolveCoords(c.localizacao, c.regiao, c.coordenadas_lat, c.coordenadas_lng);
        if (!coords) return null;

        return (
          <Marker
            key={c.id}
            position={coords}
            icon={c.destaque ? goldIcon : defaultIcon}
            eventHandlers={{
              click: () => onMarkerClick?.(c),
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -28]}
              opacity={1}
              className="leaflet-tooltip-portal"
            >
              <strong style={{ fontSize: 13 }}>{c.nome}</strong>
              <br />
              <span style={{ fontSize: 11, opacity: 0.7 }}>{c.localizacao}</span>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
