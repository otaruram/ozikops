package main

import (
	"encoding/json"
	"fmt"
)

type JSON []byte

func (m JSON) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf("%q", m)), nil
}

type Query struct {
	Data JSON `json:"data"`
}

func main() {
	docData := map[string]interface{}{
		"text": string([]byte{0xff, 0xfe, 0xfd}),
	}
	parsedJsonBytes, _ := json.Marshal(docData)
	fmt.Printf("json.Marshal output: %s\n", string(parsedJsonBytes))
	
	q := Query{Data: JSON(parsedJsonBytes)}
	out, err := json.Marshal(q)
	fmt.Printf("Prisma marshal output err: %v\n", err)
	fmt.Printf("Prisma marshal output: %s\n", string(out))
}
