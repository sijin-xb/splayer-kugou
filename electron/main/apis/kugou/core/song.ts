import { decodeName, fillCover } from "./config";
import type { KGSong, Quality } from "@shared/types/platform/kugou";
import { isExplicitLabel, stripExplicitLabel } from "@shared/utils/explicit";

export interface KGAudioInfo {
  hash?: string;
  hash_128?: string;
  hash_320?: string;
  hash_flac?: string;
  hash_high?: string;
  filesize?: number;
  filesize_128?: number;
  filesize_320?: number;
  filesize_flac?: number;
  filesize_high?: number;
  duration?: number;
  duration_128?: number;
  duration_320?: number;
  duration_flac?: number;
  duration_high?: number;
  timelength?: number;
  timelength_128?: number;
  timelength_320?: number;
  timelength_flac?: number;
  timelength_high?: number;
}

/** 专辑接口的歌曲结构，也是其他列表归一化时的公共输入 */
export interface KGResourceSong {
  base?: {
    audio_id?: number;
    audio_name?: string;
    album_id?: string | number;
    author_name?: string;
    album_audio_id?: number;
  };
  audio_info?: KGAudioInfo;
  authors?: Array<{ author_id?: string | number; author_name?: string }>;
  album_info?: { album_name?: string; cover?: string };
  /** 专辑内碟片信息，disc 从 1 开始 */
  extend?: { disc?: number; cd_name?: string };
  trans_param?: { union_cover?: string; songname_suffix?: string };
  deprecated?: {
    pay_type?: number;
    pkg_price?: number;
    price?: number;
    feetype?: number;
  };
  copyright?: { privilege?: number };
}

interface SongDefaults {
  albumId?: string;
  albumName?: string;
  cover?: string;
}

/** 歌单、排行、推荐接口共用的扁平歌曲结构 */
export interface KGFlatSong {
  hash?: string;
  name?: string;
  songname?: string;
  ori_audio_name?: string;
  audio_name?: string;
  singername?: string;
  author_name?: string;
  filename?: string;
  size?: number;
  timelen?: number;
  timelength?: number;
  time_length?: number;
  duration?: number;
  bitrate?: number;
  privilege?: number;
  level?: number;
  media_pay_type?: number;
  pay_type?: number;
  feetype?: number;
  pkg_price?: number;
  price?: number;
  audio_id?: number | string;
  mixsongid?: number | string;
  album_audio_id?: number | string;
  album_id?: number | string;
  fileid?: number | string;
  hash_128?: string;
  hash_320?: string;
  hash_flac?: string;
  hash_high?: string;
  filesize_128?: number;
  filesize_320?: number;
  filesize_flac?: number;
  filesize_high?: number;
  cover?: string;
  img?: string;
  sizable_cover?: string;
  album_name?: string;
  albumname?: string;
  albuminfo?: { name?: string; id?: number | string };
  singerinfo?: Array<{ name?: string; id?: number | string }>;
  /** 歌单/历史返回数组，每日推荐返回对象，两种都要处理 */
  relate_goods?: Array<{ level?: number; hash?: string; size?: number }> | Record<string, unknown>;
  download?: Array<{ hash?: string; pay_type?: number }>;
  trans_param?: {
    union_cover?: string;
    ogg_128_hash?: string;
    ogg_128_filesize?: number;
    ogg_320_hash?: string;
    ogg_320_filesize?: number;
  };
}

/** 扁平结构的时长单位，推荐接口用秒，其余接口用毫秒 */
export interface FlatSongOptions {
  seconds?: boolean;
}

/** 音质档位编号，2/4/5/6 分别对应 128k/320k/flac/24bit */
const LEVEL_QUALITY: Record<number, Quality> = {
  2: "128k",
  4: "320k",
  5: "flac",
  6: "flac24bit",
};

/**
 * 解析名为 `歌手 - 歌名.mp3` 的展示字段
 * @param value - 原始名称
 * @returns 歌手与歌名
 */
const splitDisplayName = (value: string): { artist: string; name: string } => {
  const trimmed = value.replace(/\.(mp3|flac|m4a|ape|ogg|wav)$/i, "").trim();
  const index = trimmed.indexOf(" - ");
  if (index < 0) return { artist: "", name: trimmed };
  return { artist: trimmed.slice(0, index).trim(), name: trimmed.slice(index + 3).trim() };
};

/**
 * 统一歌单、排行、推荐与云盘接口的扁平歌曲结构
 * @param raw - 接口原始条目
 * @param options - 时长单位等可选项
 * @returns 时长为毫秒的 KG 歌曲
 */
export const normalizeFlatSong = (raw: KGFlatSong, options: FlatSongOptions = {}): KGSong => {
  const hash = String(raw.hash ?? "");
  const hashes: Partial<Record<Quality, string>> = {};
  const sizes: Partial<Record<Quality, number>> = {};

  if (hash && raw.size) {
    hashes["128k"] = hash;
    sizes["128k"] = raw.size;
  }
  // 每日推荐直接给出各档 hash 与大小，不带 relate_goods
  const direct: Array<[Quality, string | undefined, number | undefined]> = [
    ["128k", raw.hash_128, raw.filesize_128],
    ["320k", raw.hash_320, raw.filesize_320],
    ["flac", raw.hash_flac, raw.filesize_flac],
    ["flac24bit", raw.hash_high, raw.filesize_high],
  ];
  for (const [quality, variantHash, size] of direct) {
    if (!variantHash || !size || hashes[quality]) continue;
    hashes[quality] = variantHash;
    sizes[quality] = size;
  }
  const variants = Array.isArray(raw.relate_goods)
    ? raw.relate_goods
    : Object.values(raw.relate_goods ?? {}).filter(
        (item): item is { level?: number; hash?: string; size?: number } =>
          typeof item === "object" && item !== null,
      );
  for (const variant of variants) {
    const quality = LEVEL_QUALITY[Number(variant.level)];
    if (!quality || !variant.hash) continue;
    if (hashes[quality]) continue;
    hashes[quality] = variant.hash;
    if (variant.size) sizes[quality] = variant.size;
  }

  const rawDuration = raw.timelen || raw.timelength || raw.time_length || raw.duration || 0;
  const duration = options.seconds ? rawDuration * 1000 : rawDuration;

  const display = splitDisplayName(String(raw.name || raw.filename || ""));
  const singers = (raw.singerinfo ?? []).map((singer) => ({
    id: singer.id !== undefined ? String(singer.id) : undefined,
    name: decodeName(singer.name),
  }));
  const artistText =
    singers.length > 0
      ? singers.map((singer) => singer.name).join(" / ")
      : decodeName(raw.singername || raw.author_name || display.artist);
  const artists = singers.length
    ? singers
    : artistText
        .split(" / ")
        .filter(Boolean)
        .map((name) => ({ id: undefined, name }));
  const title =
    raw.ori_audio_name || raw.songname || raw.audio_name
      ? decodeName(raw.ori_audio_name || raw.songname || raw.audio_name)
      : display.name;
  const album = decodeName(raw.albuminfo?.name || raw.album_name || raw.albumname || "");
  const albumId = raw.albuminfo?.id ?? raw.album_id;
  const cover = raw.trans_param?.union_cover || raw.cover || raw.sizable_cover || raw.img;
  const payplay =
    raw.media_pay_type ??
    raw.pay_type ??
    raw.download?.find((item) => item.hash === hash)?.pay_type ??
    0;

  return {
    id: String(raw.audio_id || hash),
    audioId: Number(raw.audio_id ?? 0),
    albumAudioId: Number(raw.mixsongid ?? raw.album_audio_id ?? 0),
    fileId: Number(raw.fileid ?? 0),
    hash,
    name: title,
    artist: artistText,
    artistId: artists[0]?.id,
    artists,
    album,
    albumId: albumId !== undefined ? String(albumId) : "",
    cover: fillCover(cover, 300),
    coverOriginal: fillCover(cover, 480),
    interval: duration / 1000,
    duration,
    qualities: Object.keys(hashes) as Quality[],
    hashes,
    sizes,
    pay: {
      payplay,
      privilege: raw.privilege ?? 0,
      feetype: raw.feetype ?? 0,
      pkg_price: raw.pkg_price ?? 0,
      price: raw.price ?? 0,
    },
  };
};

/**
 * 统一歌单、专辑和歌手接口的歌曲身份、音质及展示字段
 * @param raw - 适配为资源结构的歌曲
 * @param defaults - 集合中已知的专辑信息
 * @returns 时长为毫秒的 KG 歌曲
 */
export const normalizeKGSong = (raw: KGResourceSong, defaults: SongDefaults = {}): KGSong => {
  const base = raw.base ?? {};
  const audio = raw.audio_info ?? {};
  const cover = raw.album_info?.cover || raw.trans_param?.union_cover || defaults.cover;
  const duration =
    audio.timelength_128 ||
    audio.timelength ||
    audio.timelength_320 ||
    audio.timelength_flac ||
    audio.timelength_high ||
    audio.duration_128 ||
    audio.duration ||
    audio.duration_320 ||
    audio.duration_flac ||
    audio.duration_high ||
    0;
  const hashes: Partial<Record<Quality, string>> = {};
  const sizes: Partial<Record<Quality, number>> = {};
  const variants: Array<[Quality, string | undefined, number | undefined]> = [
    ["128k", audio.hash_128 || audio.hash, audio.filesize_128 || audio.filesize],
    ["320k", audio.hash_320, audio.filesize_320],
    ["flac", audio.hash_flac, audio.filesize_flac],
    ["flac24bit", audio.hash_high, audio.filesize_high],
  ];
  for (const [quality, hash, size] of variants) {
    if (hash && size) {
      hashes[quality] = hash;
      sizes[quality] = size;
    }
  }

  const authors = raw.authors?.filter((author) => author.author_name);
  const artists = authors?.length
    ? authors.map((author) => ({
        id: author.author_id || undefined,
        name: decodeName(author.author_name),
      }))
    : (base.author_name || "")
        .split("、")
        .filter(Boolean)
        .map((name) => ({ id: undefined, name: decodeName(name.trim()) }));
  const hash = audio.hash_128 || audio.hash || "";
  const rawName = decodeName(base.audio_name);
  const explicit = isExplicitLabel(raw.trans_param?.songname_suffix) || isExplicitLabel(rawName);

  return {
    id: String(base.audio_id || hash),
    audioId: base.audio_id ?? 0,
    albumAudioId: base.album_audio_id,
    hash,
    name: explicit ? stripExplicitLabel(rawName) : rawName,
    explicit: explicit || undefined,
    artist: artists.map((artist) => artist.name).join(" / "),
    artistId: artists[0]?.id,
    artists,
    album: decodeName(raw.album_info?.album_name || defaults.albumName),
    albumId: Number(base.album_id) > 0 ? String(base.album_id) : defaults.albumId || "",
    disc: raw.extend?.disc || undefined,
    discTitle: decodeName(raw.extend?.cd_name) || undefined,
    cover: fillCover(cover, 300),
    coverOriginal: fillCover(cover, 480),
    interval: duration / 1000,
    duration,
    qualities: Object.keys(hashes) as Quality[],
    hashes,
    sizes,
    pay: {
      payplay: raw.deprecated?.pay_type ?? 0,
      privilege: raw.copyright?.privilege,
      pkg_price: raw.deprecated?.pkg_price,
      price: raw.deprecated?.price,
      feetype: raw.deprecated?.feetype,
    },
  };
};
