export const environment = process.env.NODE_ENV || 'local';

export const keys ={
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || '',
    SEND_GRID: process.env.SEND_GRID_KEY || '',
    STRIPE_SECRET:process.env.STRIPE_SECRET || '',
};
