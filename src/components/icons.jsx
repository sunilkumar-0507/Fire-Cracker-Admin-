import {
  TfiAngleDown,
  TfiAngleLeft,
  TfiAngleRight,
  TfiArrowLeft,
  TfiArrowRight,
  TfiArrowTopRight,
  TfiArrowUp,
  TfiBag,
  TfiBolt,
  TfiCheck,
  TfiClose,
  TfiComment,
  TfiCrown,
  TfiEmail,
  TfiEye,
  TfiFile,
  TfiFiles,
  TfiFaceSmile,
  TfiFilter,
  TfiGift,
  TfiHeart,
  TfiHome,
  TfiInfoAlt,
  TfiLocationPin,
  TfiLock,
  TfiMenu,
  TfiMinus,
  TfiPackage,
  TfiPlus,
  TfiQuoteLeft,
  TfiReload,
  TfiRocket,
  TfiSearch,
  TfiShield,
  TfiShine,
  TfiShoppingCart,
  TfiTag,
  TfiTime,
  TfiTrash,
  TfiTruck,
  TfiUser,
  TfiWallet,
  TfiZoomIn,
} from 'react-icons/tfi';
import {
  FaAward,
  FaBuilding,
  FaFire,
  FaHeart,
  FaIndustry,
  FaLeaf,
  FaPaperPlane,
  FaPhone,
  FaShieldHalved,
  FaStar,
  FaTriangleExclamation,
  FaTurnDown,
  FaUserCheck,
  FaUsers,
  FaVolumeXmark,
} from 'react-icons/fa6';

/**
 * The app's entire icon vocabulary, in one place.
 *
 * Two sources only — Themify (`react-icons/tfi`) and Font Awesome 6
 * (`react-icons/fa6`) — so the set stays visually consistent and there is one
 * obvious file to edit when a glyph needs swapping. Components import the
 * plain-English name from here; nothing else imports an icon pack directly.
 *
 * Every glyph below is decorative: each one sits beside its own text label or
 * inside a control that already carries an `aria-label`, so they default to
 * `aria-hidden`. Pass `title` for the rare icon that has to carry meaning on
 * its own, and it is announced instead.
 */
const icon = (Glyph, name) => {
  const Icon = ({ size = 16, title, ...rest }) => (
    <Glyph size={size} title={title} aria-hidden={title ? undefined : 'true'} {...rest} />
  );
  Icon.displayName = name;
  return Icon;
};

/* Navigation and direction ------------------------------------------------ */
export const ArrowLeft = icon(TfiArrowLeft, 'ArrowLeft');
export const ArrowRight = icon(TfiArrowRight, 'ArrowRight');
export const ArrowUp = icon(TfiArrowUp, 'ArrowUp');
export const ArrowUpRight = icon(TfiArrowTopRight, 'ArrowUpRight');
export const ChevronDown = icon(TfiAngleDown, 'ChevronDown');
export const ChevronLeft = icon(TfiAngleLeft, 'ChevronLeft');
export const ChevronRight = icon(TfiAngleRight, 'ChevronRight');
export const CornerDownLeft = icon(FaTurnDown, 'CornerDownLeft');
export const Home = icon(TfiHome, 'Home');
export const Menu = icon(TfiMenu, 'Menu');
export const X = icon(TfiClose, 'X');

/* Shop -------------------------------------------------------------------- */
export const Eye = icon(TfiEye, 'Eye');
export const Heart = icon(TfiHeart, 'Heart');
export const HeartFilled = icon(FaHeart, 'HeartFilled');
export const Minus = icon(TfiMinus, 'Minus');
export const Package = icon(TfiPackage, 'Package');
export const Plus = icon(TfiPlus, 'Plus');
export const Search = icon(TfiSearch, 'Search');
export const ShoppingBag = icon(TfiBag, 'ShoppingBag');
export const ShoppingCart = icon(TfiShoppingCart, 'ShoppingCart');
export const SlidersHorizontal = icon(TfiFilter, 'SlidersHorizontal');
export const Star = icon(FaStar, 'Star');
export const Tag = icon(TfiTag, 'Tag');
export const Trash2 = icon(TfiTrash, 'Trash2');
export const Wallet = icon(TfiWallet, 'Wallet');
export const ZoomIn = icon(TfiZoomIn, 'ZoomIn');

/* Status and trust -------------------------------------------------------- */
export const AlertTriangle = icon(FaTriangleExclamation, 'AlertTriangle');
export const Award = icon(FaAward, 'Award');
export const Check = icon(TfiCheck, 'Check');
export const Clock = icon(TfiTime, 'Clock');
export const Info = icon(TfiInfoAlt, 'Info');
export const Lock = icon(TfiLock, 'Lock');
export const ShieldAlert = icon(FaShieldHalved, 'ShieldAlert');
export const ShieldCheck = icon(TfiShield, 'ShieldCheck');
export const Truck = icon(TfiTruck, 'Truck');
export const VolumeX = icon(FaVolumeXmark, 'VolumeX');

/* People and contact ------------------------------------------------------ */
export const Building2 = icon(FaBuilding, 'Building2');
export const Factory = icon(FaIndustry, 'Factory');
export const Mail = icon(TfiEmail, 'Mail');
export const MapPin = icon(TfiLocationPin, 'MapPin');
export const MessageCircle = icon(TfiComment, 'MessageCircle');
export const Phone = icon(FaPhone, 'Phone');
export const Send = icon(FaPaperPlane, 'Send');
export const User = icon(TfiUser, 'User');
export const UserCheck = icon(FaUserCheck, 'UserCheck');
export const Users = icon(FaUsers, 'Users');

/* Category and package glyphs — the icon tile on a card ------------------- */
export const Bolt = icon(TfiBolt, 'Bolt');
export const Crown = icon(TfiCrown, 'Crown');
export const Gift = icon(TfiGift, 'Gift');
export const Rocket = icon(TfiRocket, 'Rocket');
export const Smiley = icon(TfiFaceSmile, 'Smiley');
export const Spinner = icon(TfiReload, 'Spinner');

/* Content ----------------------------------------------------------------- */
export const Copy = icon(TfiFiles, 'Copy');
export const FileText = icon(TfiFile, 'FileText');
export const Flame = icon(FaFire, 'Flame');
export const Leaf = icon(FaLeaf, 'Leaf');
export const Quote = icon(TfiQuoteLeft, 'Quote');
export const Sparkles = icon(TfiShine, 'Sparkles');
