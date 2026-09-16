import type { CityLocation } from "@/game/content/locations";
import type { LocationId } from "@/game/state/types";

type CityMapProps = {
  currentLocationId: LocationId;
  disabled?: boolean;
  locations: CityLocation[];
  onTravel: (destinationId: LocationId) => void;
};

export function CityMap({
  currentLocationId,
  disabled = false,
  locations,
  onTravel,
}: CityMapProps) {
  const current = locations.find(
    (location) => location.id === currentLocationId,
  );

  return (
    <nav aria-label="Mappa della città" className="city-map">
      <ul className="city-map__list">
        {locations.map((location) => {
          const isCurrent = location.id === currentLocationId;
          const connection = current?.connections.find(
            (candidate) => candidate.destinationId === location.id,
          );
          const isReachable = Boolean(connection);

          return (
            <li
              className={`city-map__node city-map__node--${location.id}`}
              key={location.id}
            >
              <button
                aria-current={isCurrent ? "location" : undefined}
                className="city-map__button"
                disabled={disabled || isCurrent || !isReachable}
                onClick={() => onTravel(location.id)}
                type="button"
              >
                <span className="city-map__marker" aria-hidden="true" />
                <span className="city-map__label">{location.label}</span>
                <span className="city-map__status">
                  {isCurrent
                    ? "Posizione attuale"
                    : connection
                      ? `Raggiungibile · ${connection.travelSeconds}s`
                      : "Non raggiungibile da qui"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
