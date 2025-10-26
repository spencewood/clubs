import { ImageResponse } from "next/og";

// Image metadata
export const size = {
	width: 180,
	height: 180,
};

export const contentType = "image/png";

// Image generation
export default function AppleIcon() {
	return new ImageResponse(
		(
			<div
				style={{
					fontSize: 120,
					background: "white",
					width: "100%",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "black",
				}}
			>
				♣
			</div>
		),
		{
			...size,
		},
	);
}
