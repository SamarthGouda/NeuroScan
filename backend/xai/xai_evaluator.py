"""
XAI Faithfulness Evaluators.

  1. Pointing Game  — does the argmax of the heatmap fall inside the seg mask?
  2. Pixel Flipping — accuracy drop as we progressively mask top-k% pixels
"""
import numpy as np
from typing import Optional, Dict, Any


class XAIEvaluator:
    def evaluate(
        self,
        gradcam_map:      Optional[np.ndarray],
        gradcam_plus_map: Optional[np.ndarray],
        seg_mask:         Optional[np.ndarray],
    ) -> Dict[str, Any]:
        """
        Args:
            gradcam_map      : (H, W) float in [0,1]
            gradcam_plus_map : (H, W) float in [0,1]
            seg_mask         : (H, W) float/binary in [0,1]; 1 = tumor region
        """
        pointing_game = {}
        pixel_flipping = {}

        if seg_mask is not None and seg_mask.sum() > 0:
            binary_mask = (seg_mask > 0.5)

            if gradcam_map is not None:
                pointing_game["gradcam"] = self._pointing_game(gradcam_map, binary_mask)
                pixel_flipping["gradcam"] = self._pixel_flipping_curve(gradcam_map)

            if gradcam_plus_map is not None:
                pointing_game["gradcam_plus"] = self._pointing_game(gradcam_plus_map, binary_mask)
                pixel_flipping["gradcam_plus"] = self._pixel_flipping_curve(gradcam_plus_map)
        else:
            # No mask — use dummy values
            if gradcam_map is not None:
                pointing_game["gradcam"] = None
                pixel_flipping["gradcam"] = self._pixel_flipping_curve(gradcam_map)
            if gradcam_plus_map is not None:
                pointing_game["gradcam_plus"] = None
                pixel_flipping["gradcam_plus"] = self._pixel_flipping_curve(gradcam_plus_map)

        return {
            "pointing_game":   pointing_game,
            "pixel_flipping":  {
                "k_values": [5, 10, 20, 30, 50],
                **pixel_flipping,
            },
        }

    # ─────────────────────────────────────────────────────────────────────────

    def _pointing_game(self, cam: np.ndarray, mask: np.ndarray) -> float:
        """
        Returns 1.0 if argmax(cam) is inside the mask, 0.0 otherwise.
        """
        if cam.shape != mask.shape:
            import cv2
            cam = cv2.resize(cam, (mask.shape[1], mask.shape[0]))
        max_idx = np.unravel_index(cam.argmax(), cam.shape)
        return float(mask[max_idx])

    def _pixel_flipping_curve(self, cam: np.ndarray) -> list:
        """
        Simulate accuracy drop by computing how much of the total attribution
        energy is removed at each masking fraction k%.

        Returns list of 5 fractions (energy retained) at k = 5,10,20,30,50%.
        """
        flat = cam.flatten()
        total_energy = flat.sum() + 1e-8
        sorted_desc  = np.sort(flat)[::-1]
        n            = len(flat)
        result = []
        for k in [5, 10, 20, 30, 50]:
            n_mask = int(n * k / 100)
            retained = flat.copy()
            # Zero out top-k% pixels (by value)
            threshold = sorted_desc[n_mask - 1] if n_mask > 0 else sorted_desc[-1]
            retained[retained >= threshold] = 0
            result.append(round(float(retained.sum() / total_energy), 4))
        return result
