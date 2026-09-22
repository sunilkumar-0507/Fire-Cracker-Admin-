import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { ENQUIRY_STATUSES, ORDER_STATUSES } from '@/constants';

/**
 * The status vocabularies, from the API rather than from a copy of them.
 *
 * `/admin/orders/statuses` and `/admin/enquiries/statuses` exist precisely so
 * a client does not have to hardcode these words, and until now this one did
 * anyway — constants/index.js carried both lists with a comment saying which
 * server field they mirrored. That mirror is the problem: adding a status to
 * OrderStore is a one-line change on the API that leaves the admin unable to
 * set it, with nothing failing loudly enough to notice. The filter simply
 * never offers it, and orders sitting in it look like they have no status.
 *
 * So the live list wins, and the constants become the fallback rather than the
 * source. If the call fails — the API is down, the passcode has expired, the
 * network dropped — the screen keeps the words it already had instead of
 * rendering an empty dropdown, which is the one outcome worse than a stale one.
 *
 * Cached at module scope because both pages ask, the answer is a fixed list
 * that only changes when the API is redeployed, and a dropdown should not cost
 * a round trip every time somebody opens a drawer.
 */
const cache = { orders: null, enquiries: null };

function useStatuses(key, load, fallback) {
  const [statuses, setStatuses] = useState(() => cache[key] ?? fallback);

  useEffect(() => {
    if (cache[key]) return undefined;

    const controller = new AbortController();

    load(controller.signal)
      .then((list) => {
        // An empty list is not an answer worth having — it would leave the
        // page with no statuses at all, which the fallback exists to prevent.
        if (!Array.isArray(list) || list.length === 0) return;

        cache[key] = list;
        setStatuses(list);
      })
      .catch(() => {
        // Deliberately silent. The fallback is already on screen and the page
        // works; a toast here would blame the operator for a drift they
        // cannot see and cannot act on.
      });

    return () => controller.abort();
  }, [key, load, fallback]);

  return statuses;
}

/** The six words an order moves through, `cancelled` among them. */
export const useOrderStatuses = () =>
  useStatuses('orders', adminApi.orders.statuses, ORDER_STATUSES);

/** The four a bulk enquiry moves through. */
export const useEnquiryStatuses = () =>
  useStatuses('enquiries', adminApi.enquiries.statuses, ENQUIRY_STATUSES);
