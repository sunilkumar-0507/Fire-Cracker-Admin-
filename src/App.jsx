import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import router from '@/routes';
import { DEMO } from '@/demo/flags';

/**
 * Admin root.
 *
 * The offline banner is worth more here than on the shop. The storefront can
 * fall back to the catalogue it was built with and carry on selling; every
 * screen in here exists to write something, so an API that is not answering
 * means nothing on screen can be saved — and that should be said plainly
 * rather than discovered one failed save at a time.
 *
 * A demo build says so instead. There is no API behind it and nothing on screen
 * is real, which anybody looking at it should be told before they take a number
 * off it seriously.
 */
export const App = ({ offline = false, offlineReason }) => (
  <>
    {DEMO ? (
      <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-slate-950">
        Demo — invented data, no API behind it. Changes last until you refresh.
      </div>
    ) : null}

    {offline ? (
      <div
        role="alert"
        className="bg-rose-600 px-4 py-2 text-center text-sm font-medium text-white"
      >
        The API is not answering{offlineReason ? ` (${offlineReason})` : ''}. Nothing can be saved
        until it is back.
      </div>
    ) : null}

    <RouterProvider router={router} />

    <Toaster
      position="bottom-right"
      gutter={10}
      toastOptions={{
        duration: 2600,
        className: '!rounded-lg !bg-slate-900 !px-4 !py-3 !text-sm !font-medium !text-white',
        success: { iconTheme: { primary: '#2DD4BF', secondary: '#0F172A' } },
        error: { iconTheme: { primary: '#FB7185', secondary: '#0F172A' } },
      }}
    />
  </>
);

export default App;
