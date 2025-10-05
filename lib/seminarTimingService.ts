interface BookingWindowConfig {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  selectionHour: number;
  selectionMinute: number;
}

interface BookingWindowInfo {
  isOpen: boolean;
  timeUntilOpen?: number;
  timeUntilClose?: number;
  timeUntilSelection?: number;
  nextOpenTime?: Date;
  selectionTime?: Date;
}

class SeminarTimingService {
  private config: BookingWindowConfig;

  constructor() {
    this.config = {
      startHour: parseInt(process.env.NEXT_PUBLIC_BOOKING_WINDOW_START_HOUR || '10'),
      startMinute: parseInt(process.env.NEXT_PUBLIC_BOOKING_WINDOW_START_MINUTE || '30'),
      endHour: parseInt(process.env.NEXT_PUBLIC_BOOKING_WINDOW_END_HOUR || '13'),
      endMinute: parseInt(process.env.NEXT_PUBLIC_BOOKING_WINDOW_END_MINUTE || '30'),
      selectionHour: parseInt(process.env.NEXT_PUBLIC_SELECTION_HOUR || '13'),
      selectionMinute: parseInt(process.env.NEXT_PUBLIC_SELECTION_MINUTE || '30')
    };
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // If tomorrow is Sunday (0), skip to Monday (add 1 more day)
    if (tomorrow.getDay() === 0) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    return tomorrow.toISOString().split('T')[0];
  }

  // New method to get the next seminar date for booking purposes
  getNextSeminarDate(): string {
    const today = new Date();
    let nextSeminarDate = new Date();
    nextSeminarDate.setDate(today.getDate() + 1);
    
    // Skip Sundays by default - seminars never happen on Sunday
    while (nextSeminarDate.getDay() === 0) {
      nextSeminarDate.setDate(nextSeminarDate.getDate() + 1);
    }
    
    // If today is Saturday or Sunday, seminar is on Monday
    if (today.getDay() === 6 || today.getDay() === 0) {
      // Find next Monday
      const nextMonday = new Date(today);
      const daysUntilMonday = today.getDay() === 6 ? 2 : 1; // Saturday: +2, Sunday: +1
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      return nextMonday.toISOString().split('T')[0];
    }
    
    return nextSeminarDate.toISOString().split('T')[0];
  }

  // Holiday-aware seminar date calculation (will be enhanced by holiday service)
  async getHolidayAwareNextSeminarDate(): Promise<string> {
    // This method can be called by holiday service for enhanced functionality
    // For now, it returns the basic calculation - holiday service will enhance it
    return this.getNextSeminarDate();
  }

  // Get descriptive information about seminar scheduling
  getSeminarScheduleInfo(): { nextSeminarDate: string; scheduleDescription: string } {
    const today = new Date();
    const nextSeminarDate = this.getNextSeminarDate();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    let scheduleDescription = '';
    
    if (today.getDay() === 6) { // Saturday
      scheduleDescription = 'Saturday and Sunday bookings are both for Monday\'s seminar';
    } else if (today.getDay() === 0) { // Sunday
      scheduleDescription = 'Saturday and Sunday bookings are both for Monday\'s seminar';
    } else {
      scheduleDescription = `${dayName} bookings are for next working day\'s seminar`;
    }
    
    return {
      nextSeminarDate,
      scheduleDescription
    };
  }

  isWorkingDay(date: Date): boolean {
    const day = date.getDay();
    // Sunday is 0, Monday is 1, Saturday is 6
    // Working days are Monday (1) to Saturday (6), but seminars don't happen on Sunday
    // So for seminar purposes, working days are Monday (1) to Saturday (6)
    return day >= 1 && day <= 6;
  }

  isSeminarDay(date: Date): boolean {
    const day = date.getDay();
    // Seminars happen Monday (1) to Saturday (6), but NOT on Sunday (0)
    return day >= 1 && day <= 6;
  }

  formatDateWithDay(dateString: string): string {
    const date = new Date(dateString + 'T12:00:00'); // Noon to avoid timezone issues
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getTodayBookingWindowStart(): Date {
    const today = new Date();
    today.setHours(this.config.startHour, this.config.startMinute, 0, 0);
    return today;
  }

  getTodayBookingWindowEnd(): Date {
    const today = new Date();
    today.setHours(this.config.endHour, this.config.endMinute, 0, 0);
    return today;
  }

  getTodaySelectionTime(): Date {
    const today = new Date();
    today.setHours(this.config.selectionHour, this.config.selectionMinute, 0, 0);
    return today;
  }

  getNextBookingWindowStart(): Date {
    const now = new Date();
    const todayStart = this.getTodayBookingWindowStart();
    
    if (now < todayStart) {
      return todayStart;
    } else {
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
  }

  isBookingWindowOpen(): boolean {
    const now = new Date();
    
    // No bookings on Sunday - system is paused
    if (now.getDay() === 0) {
      return false;
    }
    
    const start = this.getTodayBookingWindowStart();
    const end = this.getTodayBookingWindowEnd();
    
    return now >= start && now <= end;
  }

  isSelectionTime(): boolean {
    const now = new Date();
    const selectionTime = this.getTodaySelectionTime();
    
    // Selection happens at exactly the selection time or after
    return now >= selectionTime;
  }

  shouldTriggerAutoSelection(): boolean {
    const now = new Date();
    const selectionTime = this.getTodaySelectionTime();
    const timeDiff = now.getTime() - selectionTime.getTime();
    
    // Trigger if we're within 5 minutes after selection time
    return timeDiff >= 0 && timeDiff <= 5 * 60 * 1000;
  }

  getBookingWindowInfo(): BookingWindowInfo {
    const now = new Date();
    
    // Sunday - system is paused
    if (now.getDay() === 0) {
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + 1);
      nextMonday.setHours(this.config.startHour, this.config.startMinute, 0, 0);
      
      return {
        isOpen: false,
        timeUntilOpen: nextMonday.getTime() - now.getTime(),
        nextOpenTime: nextMonday,
        selectionTime: undefined
      };
    }
    
    const start = this.getTodayBookingWindowStart();
    const end = this.getTodayBookingWindowEnd();
    const selectionTime = this.getTodaySelectionTime();
    const isOpen = this.isBookingWindowOpen();

    if (isOpen) {
      const timeUntilClose = end.getTime() - now.getTime();
      const timeUntilSelection = selectionTime.getTime() - now.getTime();
      
      return {
        isOpen: true,
        timeUntilClose,
        timeUntilSelection: timeUntilSelection > 0 ? timeUntilSelection : 0,
        selectionTime
      };
    } else if (now < start) {
      const timeUntilOpen = start.getTime() - now.getTime();
      return {
        isOpen: false,
        timeUntilOpen,
        nextOpenTime: start,
        selectionTime
      };
    } else {
      // After booking window ends
      const nextOpenTime = this.getNextBookingWindowStart();
      const timeUntilOpen = nextOpenTime.getTime() - now.getTime();
      const timeUntilSelection = selectionTime.getTime() - now.getTime();
      
      return {
        isOpen: false,
        timeUntilOpen,
        timeUntilSelection: timeUntilSelection > 0 ? timeUntilSelection : 0,
        nextOpenTime,
        selectionTime
      };
    }
  }

  formatTimeRemaining(milliseconds: number): string {
    if (milliseconds <= 0) return "Time's up!";
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatTime12Hour(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getBookingWindowConfig() {
    return {
      startTime: this.formatTime12Hour(this.getTodayBookingWindowStart()),
      endTime: this.formatTime12Hour(this.getTodayBookingWindowEnd()),
      selectionTime: this.formatTime12Hour(this.getTodaySelectionTime())
    };
  }

  async triggerAutoSelection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await fetch('/api/seminar/auto-select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: result.message,
          data: result.selection
        };
      } else {
        return {
          success: false,
          message: result.error || 'Auto-selection failed'
        };
      }
    } catch (error) {
      console.error('Auto-selection trigger error:', error);
      return {
        success: false,
        message: 'Failed to trigger auto-selection'
      };
    }
  }
}

export const seminarTimingService = new SeminarTimingService();
