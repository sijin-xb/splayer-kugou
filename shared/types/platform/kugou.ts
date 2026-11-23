/** KG 接口归一化后供主进程与渲染层共用的数据结构 */
export type Quality = "128k" | "320k" | "flac" | "flac24bit";

export interface KGSong {
  id: string;
  audioId: number;
  albumAudioId?: number;
  /** 用户歌单内的唯一标识，仅删除歌单曲目时使用 */
  fileId?: number;
  hash: string;
  name: string;
  artist: string;
  artistId?: string | number;
  artists?: Array<{ id?: string | number; name: string }>;
  album: string;
  albumId: string | number;
  /** 碟号，从 1 开始 */
  disc?: number;
  /** 碟片名称 */
  discTitle?: string;
  cover?: string;
  coverOriginal?: string;
  interval: number;
  /** 歌曲时长，单位为毫秒 */
  duration: number;
  /** 是否为 Explicit（脏标）版本 */
  explicit?: boolean;
  qualities: Quality[];
  hashes: Partial<Record<Quality, string>>;
  sizes: Partial<Record<Quality, number>>;
  pay?: {
    payplay?: number;
    privilege?: number;
    feetype?: number;
    pkg_price?: number;
    price?: number;
  };
}

export interface KGAlbumItem {
  id: string;
  name: string;
  cover?: string;
  artist: string;
  artistId?: string | number;
  trackCount: number;
  publishTime?: string;
  intro?: string;
}

export interface KGArtistItem {
  id: string;
  name: string;
  cover?: string;
  albumCount: number;
  songCount: number;
  fansCount?: number;
}

export interface KGPlaylistItem {
  id: string;
  name: string;
  cover?: string;
  creator: string;
  trackCount: number;
  playCount: number;
  /** 歌单简介，接口字段为 intro */
  description?: string;
  /** 是否为账号的「我喜欢」歌单，由接口的 is_def 标识 */
  isLiked?: boolean;
  /** 是否为平台内置歌单（默认收藏、我喜欢），由接口的 is_def 非零标识，不可删除或改名 */
  system?: boolean;
  /** 是否为收藏（来自他人）的歌单，由接口的 source===2 标识 */
  collected?: boolean;
}
