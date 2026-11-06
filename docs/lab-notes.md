# Lab 1 notes

Environment: Python 3.13.7, scanpy 1.12.5, anndata 0.13.4, numpy 2.5.4 · Node 26.13.0, Vite 8, three.js r187.

## A1 — Raw data

2700 cells × 32,738 genes, stored as a sparse CSR matrix. The first 5 × 5 block is all zeros; most entries are zero.

## A2 — Quality control

What the histograms (`python/out/qc_before.png`) show:

- `n_genes_by_counts` peaks around 800 with a long right tail up to ~3400. No cell is below ~200, so the dataset was already pre-filtered.
- `total_counts` peaks around 2200 with a tail up to ~15,000.
- `pct_counts_mt` is mostly 1–4 % (median 2.0 %, 95th percentile 4.0 %, 99th percentile 5.9 %), with a few cells up to ~22 %.

Effect of changing one threshold at a time (the defaults are 200 / 2500 / 5 %):

| Change | Cells kept |
|---|---|
| defaults | **2638** |
| max_pct_mt = 3 % | 2257 |
| max_pct_mt = 4 % | 2558 |
| max_pct_mt = 6 % | 2670 |
| max_pct_mt = 10 % | 2689 |
| max_genes = 2000 | 2635 |
| max_genes = 3000 | 2641 |
| min_genes = 300 | 2628 |
| min_genes = 500 | 2451 |

Taken alone, each rule removes: < 200 genes → 0 cells, > 2500 genes → 5 cells, mt ≥ 5 % → 57 cells.

**Final choice: the defaults (200 / 2500 / 5 %) → 2638 cells, 13,656 genes.** The 5 % cut sits just past the 95th percentile, where the tail of the mt distribution begins. 3 % would throw away 16 % of the cells, and those cells sit inside the main healthy peak. The 2500-gene cap only removes the 5 cells far out in the tail (likely doublets). The 200-gene floor removes nothing here but is kept as a safety net.

## A3 — Normalisation and PCA

Variance ratio of the first 10 PCs: 0.025, 0.013, 0.010, 0.009, 0.005, 0.003, 0.002, 0.002, 0.002, 0.002.
**The first 3 PCs together explain 4.8 %** of the variance of the 2000 scaled HVGs.

- **Why the logarithm?** Counts are very skewed: a few genes in a few cells have huge values. Without the log they would dominate the variance, and the PCA would mostly follow them. log1p compresses large values, makes the variance less dependent on the mean, and turns fold changes into differences.
- **Why only highly variable genes?** Most genes are flat or are just noise across cells and carry no information about cell type. Keeping 2000 HVGs drops that noise, makes the PCA focus on biological differences, and is much faster.
- **What does 4.8 % mean for a 3D picture?** The 3D view is a very lossy shadow: about 95 % of the variance is in the dimensions we threw away. Clusters that are separate in PC4–PC10 can overlap in 3D, and distances in the picture are only a rough hint. The elbow plot (`python/out/pca_variance.png`) keeps falling until roughly PC 7–10, so a good analysis would use around 10 PCs, not 3.

## B2 — Point cloud

- **(a)** Point size 0.015 (world units, `sizeAttenuation: true`), colour `#66ccff` on `#101114`. Small enough that the dense lobes don't merge into blobs, but the sparse cells stay visible.
- **(b)** Camera fit: `computeBoundingSphere()`, then `distance = 1.1 · r / sin(min(vFov, hFov) / 2)`. Using the narrower of the two FOVs means the sphere also fits in portrait windows. near/far are set relative to that distance (d/100, 10·d). The camera starts from an oblique direction rather than straight down z.
- **(c)** Impression: the cloud is L-shaped. There is one long, elongated arm, a second compact lobe at roughly a right angle to it, and a small blob just below the long arm. A thin, sparse arm of 13 cells sticks out along PC3. All 13 express the platelet markers **PF4 and PPBP**, so they are **platelets**. So: about 3 main lobes plus a platelet arm. Compare with the clusters in Lab 2.

**Finding:** because the export divides by the single largest absolute coordinate, the platelet arm (z = 1.0 on PC3) sets the scale. 99 % of cells end up within about ±0.2 on every axis, and the bounding sphere is much larger than the main cloud. Looking straight down z hid that arm completely, which is why the camera now starts at an angle.

## C1 — Matrices

| Action | model | view | projection |
|---|---|---|---|
| orbit | – | **changes** | – |
| zoom (OrbitControls dolly) | – | **changes** | – |
| resize window | – | – | **element 0 only** (f / aspect) |
| change fov | – | – | **elements 0 and 5** |

- The model matrix stays the identity because the points object is never moved.
- In OrbitControls, zoom moves the camera, so it changes the view matrix, not the projection.
- Projection elements 10 and 14 depend on near/far. Element 11 is −1, so clip w = −z_view.
- The view matrix stores its translation in elements 12–14 (column-major order).

## C2 — Projection by hand

`cs.projectByHand(i)` matches `Vector3.project()` to about 1e-16 for cells 0, 5 and 100, before and after orbiting. Steps:

1. model → world: `points.matrixWorld`
2. world → view: `camera.matrixWorldInverse`
3. view → clip: `camera.projectionMatrix`
4. clip → NDC: divide x, y, z by w
5. NDC → pixels: `x_px = (x + 1)/2 · W`, `y_px = (1 − y)/2 · H` (y is flipped because pixel rows go down)

## C3 — Camera experiments

- **fov 20:** zoomed in like a telephoto lens, and the perspective looks flatter.
- **fov 50:** a natural view.
- **fov 120:** the cloud becomes tiny, with strong wide-angle stretching towards the edges.
- **near = 0.0001, far = 1e6:** no visible artefact while orbiting, because all points are the same colour, so wrong depth order cannot be seen. Depth precision does collapse, though. Measured on the 2638 cells:

  | near / far | distinct 24-bit depth values |
  |---|---|
  | fitted (0.0145 / 14.5) | 2223 |
  | 0.01 / 100 | 2090 |
  | 0.0001 / 1e6 | **123** |
  | 1e-7 / 1e9 | **2** |

- **Orthographic camera** (`cs.toggleCamera()`, with the frustum matched to the perspective view at the target distance): the shapes stay the same, but the platelet arm looks shorter, and near and far points have the same size, so there are no depth cues. Also, `sizeAttenuation` is ignored by orthographic cameras: `size: 0.015` became 0.015 *pixels* and the cloud almost disappeared. The toggle converts the size to pixels (`size · (H/2) / distance`).

## Questions

**1. Coordinate spaces from `emb_pca.f32` to a pixel.**
(Before this, Python maps PCA space to model space with `(x − center) / scale`.)

| From | To | Done by |
|---|---|---|
| model space (the numbers in the file, inside the unit cube) | world space | model matrix `points.matrixWorld` (identity here) |
| world space | view / camera space | view matrix `camera.matrixWorldInverse` |
| view space | clip space | `camera.projectionMatrix` |
| clip space | NDC | perspective divide by w (done by the GPU, no matrix) |
| NDC | window / pixel coordinates | viewport transform from `renderer.setSize` / `setViewport`, y flipped |

**2. What did extreme near/far values do, and why?**
Nothing was visible here, because every point has the same colour. Depth precision was destroyed, though: the cells collapsed from 2223 to 123 distinct depth values, and with even more extreme values to only 2. The depth buffer stores roughly 1/z, not z, so most of its precision is spent just in front of the near plane. A tiny near value wastes almost all 24 bits on the space right in front of the camera. Everything at the data's distance is squeezed into the last fraction of the range, and depth ties cause z-fighting and wrong ordering once points have different colours or overlap. Precision depends mostly on near, so near should be as large as possible.

**3. Which camera for distances between clusters, and which for depth?**

- **Distances between clusters: orthographic.** The projection is parallel, so equal distances look equal anywhere in the scene. In perspective, the near platelet arm looked longer and its points looked bigger than distant ones of the same size.
- **Depth: perspective.** Size falloff and convergence while orbiting show what is in front. In the orthographic view, near and far points look identical, and depth is only visible through motion parallax.

**4. Why rescale in Python, why one scale for all axes, and what makes it reversible?**

- **Why in Python:** every file that follows the data contract then has the same, known range (the unit cube), whatever embedding produced it. The viewer can use fixed defaults for camera, point size and near/far instead of special cases per dataset. The step is recorded once in the manifest and the provenance file, instead of being hidden in rendering code. Small, centred values are also safe for float32.
- **Why one common scale:** an isotropic scale keeps shape, angles and relative distances. PC1 has about 2.5 times the variance of PC3, and the picture should show that. A separate scale per axis would stretch every axis to [−1, 1]. Low-variance axes would be blown up to the same size as PC1, so noise would look like structure and the distances between clusters would be distorted.
- **What makes it reversible:** store the per-axis `center` (3 numbers) and the single `scale` (1 number) in `manifest.json` under `normalisation`. Then `original = x · scale + center`.
- **The downside we saw:** max-abs scaling lets one small, extreme population (13 platelets) compress everything else to ±0.2. A percentile-based scale would avoid that, but then some points would fall outside the unit cube.
