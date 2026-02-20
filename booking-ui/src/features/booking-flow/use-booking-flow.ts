import { startOfDay } from 'date-fns';
import { useCallback, useMemo, useReducer } from 'react';

import { reconcileSelectedSlot } from '../../core/temporal/slot-engine';
import type { BookingStep, DiscoveryBookingResponse, SchoolDetails, SlotDto } from '../../types';

type BookingFlowState = {
  step: BookingStep;
  selectedDate: Date;
  selectedSlot: SlotDto | null;
  details: SchoolDetails;
  bookingResult: DiscoveryBookingResponse | null;
};

type BookingFlowAction =
  | { type: 'step.set'; step: BookingStep }
  | { type: 'date.select'; date: Date }
  | { type: 'slot.select'; slot: SlotDto | null }
  | { type: 'slot.reconcile'; slots: SlotDto[] }
  | { type: 'details.save'; details: SchoolDetails }
  | { type: 'booking.complete'; result: DiscoveryBookingResponse };

const INITIAL_DETAILS: SchoolDetails = {
  schoolName: '',
  city: '',
  state: '',
  county: '',
  contactName: '',
  email: '',
  phone: '',
  preferredContactMethod: 'email',
  activeStudents: 0,
  instructorCount: 1,
  currentSystem: '',
  schedulingChallenges: '',
  budgetRange: '',
  implementationTimeline: '',
};

function reducer(state: BookingFlowState, action: BookingFlowAction): BookingFlowState {
  switch (action.type) {
    case 'step.set': {
      if (state.step === action.step) {
        return state;
      }
      return {
        ...state,
        step: action.step,
      };
    }
    case 'date.select': {
      if (
        state.selectedDate.getTime() === action.date.getTime() &&
        state.selectedSlot === null
      ) {
        return state;
      }
      return {
        ...state,
        selectedDate: action.date,
        selectedSlot: null,
      };
    }
    case 'slot.select': {
      if (
        state.selectedSlot?.startUtc === action.slot?.startUtc &&
        state.selectedSlot?.endUtc === action.slot?.endUtc
      ) {
        return state;
      }
      return {
        ...state,
        selectedSlot: action.slot,
      };
    }
    case 'slot.reconcile': {
      const nextSlot = reconcileSelectedSlot(state.selectedSlot, action.slots);
      if (
        state.selectedSlot?.startUtc === nextSlot?.startUtc &&
        state.selectedSlot?.endUtc === nextSlot?.endUtc
      ) {
        return state;
      }
      return {
        ...state,
        selectedSlot: nextSlot,
      };
    }
    case 'details.save': {
      if (state.details === action.details) {
        return state;
      }
      return {
        ...state,
        details: action.details,
      };
    }
    case 'booking.complete':
      return {
        ...state,
        bookingResult: action.result,
        step: 5,
      };
    default:
      return state;
  }
}

export function useBookingFlow() {
  const [state, dispatch] = useReducer(reducer, {
    step: 1,
    selectedDate: startOfDay(new Date()),
    selectedSlot: null,
    details: INITIAL_DETAILS,
    bookingResult: null,
  });

  const setStep = useCallback((step: BookingStep) => dispatch({ type: 'step.set', step }), []);
  const selectDate = useCallback((date: Date) => dispatch({ type: 'date.select', date }), []);
  const selectSlot = useCallback((slot: SlotDto | null) => dispatch({ type: 'slot.select', slot }), []);
  const reconcileSlot = useCallback((slots: SlotDto[]) => dispatch({ type: 'slot.reconcile', slots }), []);
  const saveDetails = useCallback(
    (details: SchoolDetails) => dispatch({ type: 'details.save', details }),
    [],
  );
  const completeBooking = useCallback(
    (result: DiscoveryBookingResponse) => dispatch({ type: 'booking.complete', result }),
    [],
  );

  return useMemo(
    () => ({
      ...state,
      setStep,
      selectDate,
      selectSlot,
      reconcileSelectedSlot: reconcileSlot,
      saveDetails,
      completeBooking,
    }),
    [completeBooking, reconcileSlot, saveDetails, selectDate, selectSlot, setStep, state],
  );
}
