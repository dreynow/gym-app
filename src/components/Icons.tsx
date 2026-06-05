/**
 * Icon set for the app. Per the Rack design system, we use Lucide (stroke only,
 * never filled). These aliases keep our internal `Icon*` names stable while the
 * underlying glyphs come from `lucide-react`, so call sites don't change.
 */
import {
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Dumbbell,
  History,
  LineChart,
  List,
  Minus,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Scale,
  Search,
  Settings,
  StickyNote,
  Timer,
  Trash2,
  Trophy,
  Upload,
  X,
} from 'lucide-react'

export const IconDumbbell = Dumbbell
export const IconHistory = History
export const IconChart = LineChart
export const IconBody = Scale
export const IconLibrary = List
export const IconSettings = Settings
export const IconPlus = Plus
export const IconMinus = Minus
export const IconCheck = Check
export const IconX = X
export const IconTimer = Timer
export const IconTrash = Trash2
export const IconEdit = Pencil
export const IconSearch = Search
export const IconPlay = Play
export const IconChevronRight = ChevronRight
export const IconChevronLeft = ChevronLeft
export const IconBack = ChevronLeft
export const IconTrophy = Trophy
export const IconCalculator = Calculator
export const IconDownload = Download
export const IconUpload = Upload
export const IconNote = StickyNote
export const IconMore = MoreHorizontal
