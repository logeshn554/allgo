-- Migration 014: Add Porter-style Vehicle Types to Parcels
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'parcels' AND column_name = 'vehicle_type'
    ) THEN
        ALTER TABLE parcels
        ADD COLUMN vehicle_type VARCHAR(32) NOT NULL DEFAULT 'TWO_WHEELER';

        ALTER TABLE parcels
        ADD CONSTRAINT chk_parcel_vehicle_type
        CHECK (vehicle_type IN ('TWO_WHEELER', 'THREE_WHEELER', 'TATA_ACE', 'PICKUP_TRUCK'));
    END IF;
END $$;
