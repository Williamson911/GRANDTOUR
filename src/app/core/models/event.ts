export interface Event {
  id : string;
  name: string;
  type: 'Regional' | 'Finals';
  date: Date;
  location: {
    city: string;
    country: string;
    venue: string;
    lat: number;
    lng: number;
  };
  registerLink?: string;
  registered: boolean;
}
