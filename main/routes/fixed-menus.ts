import { Router, Request, Response } from 'express';
import { getDatabase, withTxn } from '../db';
import { requireRole } from '../middleware/security';
import { readFixedMenuCourses, saveFixedMenuCourses } from '../services/fixed-menu';

const router = Router();

/**
 * The configuration side of a fixed menu — its courses, where each draws from,
 * and what a single dish inside one costs extra. The domain logic lives in
 * `services/fixed-menu.ts`; this file does authorization and HTTP only.
 *
 * Ordering does not come through here: a menu reaches the till on the product
 * it is, with its courses already attached by GET /products.
 */

router.get('/:productId', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const product = db.prepare(
      'SELECT id, name, price, is_fixed_menu, fixed_menu_includes_cover FROM products WHERE id = ? AND deleted_at IS NULL'
    ).get(req.params.productId) as any;
    if (!product) return res.status(404).json({ error: 'Product not found' });

    res.json({
      product_id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      is_fixed_menu: Number(product.is_fixed_menu || 0) === 1,
      includes_cover: Number(product.fixed_menu_includes_cover || 0) === 1,
      courses: readFixedMenuCourses(db, product.id),
    });
  } catch (error: any) {
    console.error('[API] Internal error:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Internal server error' });
  }
});

// Replaces the whole configuration. The editor hands over the finished menu,
// so a course deleted in the UI has to disappear here too.
router.put('/:productId', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const productId = String(req.params.productId);
    const courses = withTxn(() => saveFixedMenuCourses(db, productId, req.body?.courses));
    res.json({ product_id: productId, courses });
  } catch (error: any) {
    if (!error.statusCode) console.error('[API] Internal error:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Internal server error' });
  }
});

export const fixedMenuRoutes = router;
