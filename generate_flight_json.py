import csv
import json

FLIGHT_DATA = "data/DelayedFlightsJan2008.csv"
ORIGIN_COORDS = "data/generatedOrigintCoordinates.csv"
DEST_COORDS = "data/generatedDestCoordinates.csv"
OUTPUT_JSON = "flights.json"

def load_coords(filepath, code_field):
    coords = {}
    with open(filepath, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            code = row[code_field]
            coords[code] = {
                'lat': float(row['Latitude']),
                'lon': float(row['Longitude'])
            }
    return coords


origin_coords = load_coords(ORIGIN_COORDS, "Origin")
dest_coords = load_coords(DEST_COORDS, "Dest")

flights = []
with open(FLIGHT_DATA, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        origin = row['Origin']
        dest = row['Dest']
        try:
            delay = float(row['ArrDelay'])
        except ValueError:
            continue

        if origin not in origin_coords or dest not in dest_coords:
            continue

        year = row['Year']
        month = row['Month'].zfill(2)
        day = row['DayofMonth'].zfill(2)
        date = f"{year}-{month}-{day}"

        flight = {
            "origin": origin,
            "dest": dest,
            "originCoords": origin_coords[origin],
            "destCoords": dest_coords[dest],
            "delay": delay,
            "flightNum": row['FlightNum'],
            "date": date
        }
        flights.append(flight)


with open(OUTPUT_JSON, 'w', encoding='utf-8') as out:
    json.dump(flights, out, indent=2)

print(f"Generated {len(flights)} flights in {OUTPUT_JSON}")
