<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Esta función recalcula el subtotal, luego le aplica el porcentaje de tax de la venta (tax_percent)
        // Y graba los campos calculados de la tabla sales para siempre estar 100% íntegros.
        $functionSql = <<<SQL
CREATE OR REPLACE FUNCTION update_sales_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_id UUID;
    v_subtotal NUMERIC(15,2);
    v_tax_percent NUMERIC(5,2);
    v_tax_amount NUMERIC(15,2);
    v_total NUMERIC(15,2);
BEGIN
    -- Determine the sale_id depending on the operation
    IF TG_OP = 'DELETE' THEN
        v_sale_id := OLD.sale_id;
    ELSE
        v_sale_id := NEW.sale_id;
    END IF;

    -- Calculate the subtotal from sale_items (Quantity * (UnitPrice - Discount))
    -- Assuming discount_percent is 0-100.
    SELECT COALESCE(SUM(quantity_purchased * item_unit_price * (1 - (discount_percent / 100))), 0)
    INTO v_subtotal
    FROM sale_items
    WHERE sale_id = v_sale_id AND deleted_at IS NULL;

    -- Get the current tax_percent from the sale
    SELECT tax_percent INTO v_tax_percent
    FROM sales
    WHERE id = v_sale_id;

    -- If sale doesn't exist anymore, just return
    IF v_tax_percent IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate tax and total
    v_tax_amount := v_subtotal * (v_tax_percent / 100);
    v_total := v_subtotal + v_tax_amount;

    -- Update the sales header
    UPDATE sales
    SET subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total = v_total
    WHERE id = v_sale_id;

    RETURN NULL; -- AFTER triggers don't need to return the row
END;
$$ LANGUAGE plpgsql;
SQL;

        $triggerSql = <<<SQL
CREATE TRIGGER trg_update_sales_totals
AFTER INSERT OR UPDATE OR DELETE ON sale_items
FOR EACH ROW
EXECUTE FUNCTION update_sales_totals();
SQL;

        DB::unprepared($functionSql);
        DB::unprepared($triggerSql);
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS trg_update_sales_totals ON sale_items;');
        DB::unprepared('DROP FUNCTION IF EXISTS update_sales_totals();');
    }
};
